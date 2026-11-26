import { getAccessToken } from '@/utils/tokenStore'

//로그인 화면 경로 - 메인 페이지가 로그인 화면 역할
export const LOGIN_PATH = '/'

type LoginRouter = { replace(href: string): void }

export function redirectToLogin(router: LoginRouter) {
  router.replace(LOGIN_PATH)
}

//액세스 토큰 조회 - 없으면 로그인 화면으로 이동 후 null 반환
export function getAccessTokenOrRedirect(router: LoginRouter) {
  const accessToken = getAccessToken()

  if (!accessToken) {
    redirectToLogin(router)
    return null
  }

  return accessToken
}
