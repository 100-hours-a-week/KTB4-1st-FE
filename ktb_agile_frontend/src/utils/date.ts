export function formatLastTime(createdAt: string) {
  // 서버의 시간대 없는 LocalDateTime은 KST로 해석합니다.
  const timestamp =
    createdAt.includes('T') && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(createdAt)
      ? `${createdAt}+09:00`
      : createdAt
  const elapsedMilliseconds = Date.now() - new Date(timestamp).getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000))

  if (elapsedMinutes < 1) return '방금 전'
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  return `${Math.floor(elapsedHours / 24)}일 전`
}
