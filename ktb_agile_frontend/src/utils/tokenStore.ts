// 액세스 토큰을 어디에 어떻게 보관하는지는 이 파일만 알고 있습니다.
// 저장 방식을 바꿀 때는 이 파일만 수정하면 됩니다.
const ACCESS_TOKEN_KEY = 'accessToken'

function getStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}

//저장된 액세스 토큰 조회 - 없거나 서버에서 실행되면 null 반환
export function getAccessToken() {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) || null
}

export function setAccessToken(accessToken: string) {
  getStorage()?.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export function clearAccessToken() {
  getStorage()?.removeItem(ACCESS_TOKEN_KEY)
}

function getUserIdFromAccessToken(accessToken: string) {
  try {
    const payloadPart = accessToken.split('.')[1]
    if (!payloadPart) return null

    const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    )
    const payload = JSON.parse(window.atob(paddedPayload)) as { sub?: string }
    const userId = Number(payload.sub)

    return Number.isSafeInteger(userId) && userId > 0 ? userId : null
  } catch {
    return null
  }
}

//저장된 토큰에서 현재 사용자 ID 조회 - 토큰이 없거나 읽을 수 없으면 null 반환
export function getCurrentUserId() {
  const accessToken = getAccessToken()
  return accessToken ? getUserIdFromAccessToken(accessToken) : null
}
