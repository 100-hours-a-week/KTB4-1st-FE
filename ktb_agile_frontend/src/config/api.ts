import { AUTH_ERRORS } from '@/constants/errors/auth'
import axios, { type InternalAxiosRequestConfig } from 'axios'

// 배포 환경에서는 Nginx가 /api 요청을 백엔드로 전달합니다.
// NEXT_PUBLIC_API_BASE_URL을 지정하면 환경별 기본 주소보다 우선합니다.
const defaultApiBaseUrl =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://127.0.0.1:8080'

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || defaultApiBaseUrl
).replace(/\/+$/, '')

type AuthRequest = InternalAxiosRequestConfig & { retried?: boolean }

let refreshPromise: Promise<string> | null = null

function isAuthenticatedRequest(request: InternalAxiosRequestConfig) {
  const isBackendRequest = request.url?.startsWith(`${API_BASE_URL}/`)
  const requestUrl = request.url?.split('?')[0] ?? ''
  const isBffRequest =
    ['/bff/group', '/bff/chat-rooms', '/bff/my-items'].includes(requestUrl) ||
    requestUrl.startsWith('/bff/like/')
  const hasAccessToken = request.headers.get('Authorization')

  return (isBackendRequest || isBffRequest) && hasAccessToken
}

function showLoginExpiredModal() {
  window.sessionStorage.removeItem('accessToken')
  window.dispatchEvent(new Event('auth-expired'))
}

async function getNewAccessToken() {
  const response = await axios.post('/bff/auth/accesstoken', undefined, {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  })

  const accessToken = response.data.data.accessToken

  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error(AUTH_ERRORS.ACCESS_TOKEN_MISSING)
  }

  window.sessionStorage.setItem('accessToken', accessToken)
  return accessToken
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = getNewAccessToken()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function handleRequestError(error: {
  config?: InternalAxiosRequestConfig
  response?: { status?: number }
}) {
  const request = error.config as AuthRequest | undefined

  if (
    error.response?.status !== 401 ||
    !request ||
    !isAuthenticatedRequest(request)
  ) {
    throw error
  }

  if (request.retried) {
    throw error
  }

  request.retried = true

  try {
    let accessToken = window.sessionStorage.getItem('accessToken')
    const requestToken = request.headers.get('Authorization')

    // 다른 요청이 이미 토큰을 갱신했으면 저장된 새 토큰을 사용합니다.
    if (!accessToken || requestToken === `Bearer ${accessToken}`) {
      accessToken = await refreshAccessToken()
    }

    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return await axios(request)
  } catch (refreshError) {
    if (
      axios.isAxiosError(refreshError) &&
      refreshError.response?.status === 401
    ) {
      showLoginExpiredModal()
    }

    throw refreshError
  }
}

if (typeof window !== 'undefined') {
  axios.interceptors.request.use((request) => {
    if (isAuthenticatedRequest(request)) {
      const accessToken = window.sessionStorage.getItem('accessToken')

      if (accessToken) {
        request.headers.set('Authorization', `Bearer ${accessToken}`)
      }
    }
    return request
  })

  axios.interceptors.response.use(
    (response) => response,
    handleRequestError,
  )
}
