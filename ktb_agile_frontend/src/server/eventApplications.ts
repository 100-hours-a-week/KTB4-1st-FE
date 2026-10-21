import { createHash, randomUUID } from 'node:crypto'

export const EVENT_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const EVENT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Application = {
  exchangeRequestId: number
  participant1: string
  participant2: string
  photo: File
}

export class EventConfigurationError extends Error {}

function setting(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new EventConfigurationError(`${name} 설정이 필요합니다.`)
  return value
}

async function googleRequest<T>(
  url: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    // 인증 정보나 사용자 사진이 담긴 Google 응답은 로그에 남기지 않습니다.
    throw new Error(`Google API 요청 실패 (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function accessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: setting('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: setting('GOOGLE_OAUTH_CLIENT_SECRET'),
      refresh_token: setting('GOOGLE_OAUTH_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error('운영자 Google 계정 인증에 실패했습니다.')
  const data = (await response.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Google 액세스 토큰이 없습니다.')
  return data.access_token
}

async function savePhoto(
  token: string,
  folderId: string,
  application: Application,
) {
  // 교환 ID와 원본 내용이 모두 같은 경우에만 이전 업로드를 재사용합니다.
  const photoBytes = Buffer.from(await application.photo.arrayBuffer())
  const photoSha256 = createHash('sha256').update(photoBytes).digest('hex')
  const escapeQuery = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const query = new URLSearchParams({
    q: `'${escapeQuery(folderId)}' in parents and trashed = false and appProperties has { key='exchangeRequestId' and value='${application.exchangeRequestId}' } and appProperties has { key='photoSha256' and value='${photoSha256}' }`,
    fields: 'files(id,webViewLink)',
    pageSize: '1',
  })
  const existing = await googleRequest<{
    files: { id: string; webViewLink?: string }[]
  }>(`https://www.googleapis.com/drive/v3/files?${query}`, token)
  if (existing.files[0]) {
    return (
      existing.files[0].webViewLink ??
      `https://drive.google.com/file/d/${existing.files[0].id}/view`
    )
  }

  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }[application.photo.type]
  const metadata = {
    name: `exchange-${application.exchangeRequestId}.${extension}`,
    parents: [folderId],
    appProperties: {
      exchangeRequestId: String(application.exchangeRequestId),
      photoSha256,
    },
  }
  const boundary = `event_${randomUUID()}`
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${application.photo.type}\r\n\r\n`,
    ),
    photoBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const uploaded = await googleRequest<{ id: string; webViewLink?: string }>(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  // 원본을 공개하지 않습니다. 폴더 접근 권한이 있는 운영자만 열 수 있습니다.
  return (
    uploaded.webViewLink ??
    `https://drive.google.com/file/d/${uploaded.id}/view`
  )
}

// 한 Next.js 프로세스 안에서 카운터 계산과 기록을 직렬화합니다.
// 여러 서버/프로세스로 운영할 때는 DB 고유 제약과 분산 잠금으로 교체해야 합니다.
let pending: Promise<unknown> = Promise.resolve()

export function saveEventApplication(application: Application) {
  const task = pending.then(() => save(application))
  pending = task.catch(() => undefined)
  return task
}

async function save(application: Application) {
  const spreadsheetId = setting('GOOGLE_EVENT_SPREADSHEET_ID')
  const sheetName = setting('GOOGLE_EVENT_SHEET_NAME')
  const folderId = setting('GOOGLE_EVENT_DRIVE_FOLDER_ID')
  const token = await accessToken()
  const range = `'${sheetName.replace(/'/g, "''")}'!A:G`
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`
  const sheet = await googleRequest<{ values?: string[][] }>(base, token)
  const rows = sheet.values ?? []
  const headers = [
    '응모 ID',
    '교환 ID',
    '교환자 1 이름',
    '교환자 1 응모번호',
    '교환자 2 이름',
    '교환자 2 응모번호',
    '교환 사진',
  ]
  if (rows.length && headers.some((header, i) => rows[0][i] !== header)) {
    throw new EventConfigurationError(
      '이벤트 시트 첫 행의 열 이름과 순서를 설정 안내에 맞춰주세요.',
    )
  }
  if (!rows.length) {
    await googleRequest(base + '?valueInputOption=RAW', token, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] }),
    })
  }
  const existing = rows
    .slice(1)
    .find((row) => row[1] === String(application.exchangeRequestId))
  if (existing)
    return { applicationId: Number(existing[0]), alreadyApplied: true }
  const applicationId =
    rows.slice(1).reduce((max, row) => {
      const id = Number(row[0])
      return Number.isSafeInteger(id) && id > max ? id : max
    }, 0) + 1
  const photoUrl = await savePhoto(token, folderId, application)
  await googleRequest(
    base + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // RAW로 기록하여 닉네임이 = 등으로 시작해도 수식으로 실행되지 않습니다.
      body: JSON.stringify({
        values: [
          [
            applicationId,
            application.exchangeRequestId,
            application.participant1,
            '',
            application.participant2,
            '',
            photoUrl,
          ],
        ],
      }),
    },
  )
  return { applicationId, alreadyApplied: false }
}
