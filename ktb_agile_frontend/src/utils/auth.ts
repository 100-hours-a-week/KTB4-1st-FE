//로그인 화면 경로 - 메인 페이지가 로그인 화면 역할
export const LOGIN_PATH = '/'

type LoginRouter = { replace(href: string): void }

export function redirectToLogin(router: LoginRouter) {
  router.replace(LOGIN_PATH)
}

//액세스 토큰 조회 - 없으면 로그인 화면으로 이동 후 null 반환
export function getAccessTokenOrRedirect(router: LoginRouter) {
  const accessToken = window.sessionStorage.getItem('accessToken')

  if (!accessToken) {
    redirectToLogin(router)
    return null
  }

  return accessToken
}

export function getUserIdFromAccessToken(accessToken: string) {
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
