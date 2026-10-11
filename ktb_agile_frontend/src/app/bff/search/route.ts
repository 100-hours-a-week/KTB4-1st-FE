import { AUTH_ERRORS } from '@/constants/errors/auth'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: AUTH_ERRORS.LOGIN_REQUIRED,
          details: [],
        },
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const params = new URL(request.url).searchParams
  const groupId = params.get('groupId')
  const keyword = params.get('keyword')?.trim() ?? ''
  if (
    !groupId ||
    !/^[1-9]\d*$/.test(groupId) ||
    !Number.isSafeInteger(Number(groupId))
  ) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: '검색할 그룹을 선택해주세요.',
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (keyword.length > 255) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: '검색어는 255자 이하여야 합니다.',
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const url = new URL(`${backendUrl}/items`)
  url.searchParams.set('groupId', groupId)
  url.searchParams.set('keyword', keyword)
  const cursor = params.get('cursor')
  if (cursor !== null) url.searchParams.set('cursor', cursor)

  try {
    const response = await fetch(url, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })
    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: '검색 결과를 불러오지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
