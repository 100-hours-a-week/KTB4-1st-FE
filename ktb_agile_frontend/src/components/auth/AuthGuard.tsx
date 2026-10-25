'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { redirectToLogin } from '@/utils/auth'

//sessionStorage는 같은 탭 안에서 변경 이벤트가 없어 구독할 대상이 없음
function subscribe() {
  return () => {}
}

function getHasAccessToken() {
  return Boolean(window.sessionStorage.getItem('accessToken'))
}

//서버에서는 토큰을 알 수 없으므로 확인 전 상태(null)로 둠
function getServerHasAccessToken() {
  return null
}

//토큰이 확인되기 전에는 화면을 그리지 않아, 로그인 화면으로 이동하기 전 페이지가 잠깐 보이는 것을 막음
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hasAccessToken = useSyncExternalStore(
    subscribe,
    getHasAccessToken,
    getServerHasAccessToken,
  )

  useEffect(() => {
    if (hasAccessToken === false) {
      redirectToLogin(router)
    }
  }, [hasAccessToken, router])

  if (!hasAccessToken) {
    return null
  }

  return <>{children}</>
}
