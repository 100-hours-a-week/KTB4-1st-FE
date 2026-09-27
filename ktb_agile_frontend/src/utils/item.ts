import type { ItemState } from '@/types/item'

export function formatRelativeTime(createdAt: string) {
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000))

  if (elapsedMinutes < 1) return '방금 전'
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  return `${Math.floor(elapsedHours / 24)}일 전`
}

export function getItemStateLabel(itemState: ItemState) {
  return itemState === 'AVAILABLE' ? '거래 가능' : '거래 완료'
}
