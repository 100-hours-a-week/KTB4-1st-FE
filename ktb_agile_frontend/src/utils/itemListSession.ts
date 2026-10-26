// 서버 데이터와 커서는 Query 캐시가 관리하고, 화면 위치만 저장합니다.
export type ItemListSnapshot = { groupId: number; scrollY: number }
const SNAPSHOT_KEY = 'item-list:v3:position'

export function removeLegacySnapshots() {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (
        key.startsWith('item-list:v1:') ||
        key === 'item-list:last-group' ||
        key === 'item-list:v2:latest'
      ) {
        window.sessionStorage.removeItem(key)
      }
    }
  } catch {
    /* 저장소에 접근하지 못해도 목록은 조회합니다. */
  }
}
export function readItemListSession(groupId: number): ItemListSnapshot | null {
  const saved = readLastItemListSession()
  return saved?.groupId === groupId ? saved : null
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
      Number.isFinite(value.scrollY) &&
      value.scrollY >= 0
    ) {
      return { groupId: value.groupId, scrollY: value.scrollY }
    }
  } catch {
    /* 잘못된 위치 정보는 무시합니다. */
  }
  return null
}
export function saveItemListSession({ groupId, scrollY }: ItemListSnapshot) {
  try {
    window.sessionStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ groupId, scrollY }),
    )
  } catch {
    /* 페이지 이동은 계속합니다. */
  }
}
export function clearItemListSession() {
  try {
    window.sessionStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    /* 그룹 변경은 계속합니다. */
  }
}
