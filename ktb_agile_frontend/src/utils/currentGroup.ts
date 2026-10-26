const CURRENT_GROUP_ID_KEY = 'currentGroupId'

export function setCurrentGroupId(groupId: number) {
  window.sessionStorage.setItem(CURRENT_GROUP_ID_KEY, String(groupId))
}

export function getCurrentGroupId() {
  const groupId = Number(window.sessionStorage.getItem(CURRENT_GROUP_ID_KEY))
  if (Number.isSafeInteger(groupId) && groupId > 0) return groupId

  setCurrentGroupId(0)
  return 0
}
