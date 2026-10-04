import { INQUIRY_ERRORS } from '@/constants/errors/inquiry'
const koreanDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function formatRegisteredAt(date: Date) {
  const parts = Object.fromEntries(
    koreanDateTimeFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  )

  return `${parts.year}년 ${parts.month}월 ${parts.day}일 ${parts.hour}시 ${parts.minute}분`
}

function getDiscordWebhookUrl() {
  try {
    const url = new URL(process.env.DISCORD_WEBHOOK_URL || '')
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'discord.com' ||
      !/^\/api\/(?:v\d+\/)?webhooks\/\d+\/[^/]+\/?$/.test(url.pathname)
    ) {
      return null
    }
    url.searchParams.set('wait', 'true')
    return url
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { message: INQUIRY_ERRORS.REQUEST_INVALID },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json(
      { message: INQUIRY_ERRORS.REQUEST_INVALID },
      { status: 400 },
    )
  }

  const { type, content } = body as Record<string, unknown>
  const text = typeof content === 'string' ? content.trim() : ''
  if (
    (type !== 'INQUIRY' && type !== 'BUG_REPORT') ||
    !text ||
    text.length > 500
  ) {
    return Response.json(
      { message: INQUIRY_ERRORS.CONTENT_INVALID },
      { status: 400 },
    )
  }

  const webhookUrl = getDiscordWebhookUrl()
  if (!webhookUrl) {
    return Response.json(
      { message: INQUIRY_ERRORS.CONFIG_MISSING },
      { status: 500 },
    )
  }

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**[${type === 'INQUIRY' ? '문의 내용' : '오류 리포트'}]** - ${formatRegisteredAt(new Date())}\n\n${text}`,
        allowed_mentions: { parse: [] },
      }),
      cache: 'no-store',
    })

    if (!discordResponse.ok) {
      return Response.json(
        { message: INQUIRY_ERRORS.SUBMIT_FAILED },
        { status: 502 },
      )
    }
    return Response.json({ message: '등록되었습니다.' }, { status: 201 })
  } catch {
    return Response.json(
      { message: INQUIRY_ERRORS.SUBMIT_FAILED },
      { status: 502 },
    )
  }
}
