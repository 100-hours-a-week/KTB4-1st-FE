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
      { message: '요청 형식이 올바르지 않습니다.' },
      { status: 400 },
    )
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json(
      { message: '요청 형식이 올바르지 않습니다.' },
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
      { message: '글 유형과 500자 이내의 내용을 확인해주세요.' },
      { status: 400 },
    )
  }

  const webhookUrl = getDiscordWebhookUrl()
  if (!webhookUrl) {
    return Response.json(
      { message: '문의 등록 설정을 확인할 수 없습니다.' },
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
        { message: '문의 등록에 실패했습니다. 다시 시도해주세요.' },
        { status: 502 },
      )
    }
    return Response.json({ message: '등록되었습니다.' }, { status: 201 })
  } catch {
    return Response.json(
      { message: '문의 등록에 실패했습니다. 다시 시도해주세요.' },
      { status: 502 },
    )
  }
}
