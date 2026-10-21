import type { ItemListItem, ItemListResponse } from '@/types/item'

export type ItemListSnapshot = ItemListResponse['data'] & {
  groupId: number
  scrollY: number
}

const SNAPSHOT_KEY = 'item-list:v2:latest'

export function removeLegacySnapshots() {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith('item-list:v1:') || key === 'item-list:last-group') {
        window.sessionStorage.removeItem(key)
      }
    }
  } catch {
    // 이전 데이터 정리에 실패해도 목록 조회는 계속합니다.
  }
}

function isItem(value: unknown): value is ItemListItem {
  if (!value || typeof value !== 'object') return false
  const item = value as ItemListItem
  return (
    Number.isSafeInteger(item.itemId) &&
    item.itemId > 0 &&
    typeof item.title === 'string' &&
    typeof item.contentPreview === 'string' &&
    Number.isFinite(item.quantity) &&
    Number.isSafeInteger(item.owner?.userId) &&
    typeof item.owner?.nickname === 'string' &&
    (item.itemState === 'AVAILABLE' || item.itemState === 'UNAVAILABLE') &&
    (item.thumbnailImageUrl === null ||
      typeof item.thumbnailImageUrl === 'string') &&
    Number.isFinite(item.likeCount) &&
    Number.isFinite(item.viewCount) &&
    Number.isFinite(item.exchangeRequestCount) &&
    typeof item.isLiked === 'boolean' &&
    typeof item.createdAt === 'string'
  )
}

export function readItemListSession(groupId: number): ItemListSnapshot | null {
  const snapshot = readLastItemListSession()
  return snapshot?.groupId === groupId ? snapshot : null
}

export function readLastItemListSession(): ItemListSnapshot | null {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(SNAPSHOT_KEY) ?? 'null',
    )
    if (
      value &&
      Number.isSafeInteger(value.groupId) &&
      value.groupId > 0 &&
      Array.isArray(value.items) &&
      value.items.every(isItem) &&
      Number.isFinite(value.scrollY) &&
      value.scrollY >= 0 &&
      (value.nextCursor === null || typeof value.nextCursor === 'string') &&
      typeof value.hasNext === 'boolean'
    )
      return value
  } catch {
    // 저장소 접근 실패나 잘못된 데이터는 새 목록 조회로 대체합니다.
  }
  return null
}

export function saveItemListSession(snapshot: ItemListSnapshot) {
  try {
    window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // 저장 공간이 부족해도 페이지 이동은 계속합니다.
  }
}

export function clearItemListSession() {
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // 저장소 접근에 실패해도 그룹 변경은 계속합니다.
  }
}
