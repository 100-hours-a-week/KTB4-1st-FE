const koreanDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function getKoreanDay(date: Date) {
  const parts = Object.fromEntries(
    koreanDateFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, Number(value)]),
  )

  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000
}

export function formatCreatedDate(createdAt: string) {
  const timestamp =
    createdAt.includes('T') && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(createdAt)
      ? `${createdAt}+09:00`
      : createdAt
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const daysAgo = Math.max(0, getKoreanDay(new Date()) - getKoreanDay(date))

  if (daysAgo === 0) return '오늘'
  if (daysAgo === 1) return '어제'
  return `${daysAgo}일 전`
}
