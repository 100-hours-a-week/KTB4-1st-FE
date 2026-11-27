import axios, { type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config/api'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { LOGIN_PATH } from '@/utils/auth'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '@/utils/tokenStore'

// 우리 서버(BFF, 백엔드)로 보내는 요청 전용 axios 인스턴스입니다.
// 저장된 액세스 토큰을 자동으로 붙이고, 401 응답이면 토큰을 재발급해 한 번 다시 보냅니다.
// S3 presigned URL 같은 외부 주소로 보내는 요청은 토큰이 붙지 않도록 전역 axios를 사용합니다.
export const apiClient = axios.create()

const REFRESH_PATH = '/bff/auth/accesstoken'

type AuthRequest = InternalAxiosRequestConfig & { retried?: boolean }

let refreshPromise: Promise<string> | null = null

function getRequestPath(request: InternalAxiosRequestConfig) {
  return request.url?.split('?')[0] ?? ''
}

// 요청 주소만 보고 우리 서버로 가는 요청인지 판단합니다.
function isOwnServerRequest(request: InternalAxiosRequestConfig) {
  const path = getRequestPath(request)

  if (path === REFRESH_PATH) return false

  return path.startsWith('/bff/') || path.startsWith(`${API_BASE_URL}/`)
}

function isAuthenticatedRequest(request: InternalAxiosRequestConfig) {
  return (
    isOwnServerRequest(request) && Boolean(request.headers.get('Authorization'))
  )
}

function showLoginExpiredModal() {
  clearAccessToken()
  window.dispatchEvent(new Event('auth-expired'))
}

async function getNewAccessToken() {
  const response = await axios.post(REFRESH_PATH, undefined, {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  })

  const accessToken = response.data.data.accessToken

  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error(AUTH_ERRORS.ACCESS_TOKEN_MISSING)
  }

  setAccessToken(accessToken)
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

function attachAccessToken(request: InternalAxiosRequestConfig) {
  if (!isOwnServerRequest(request) || request.headers.get('Authorization')) {
    return request
  }

  const accessToken = getAccessToken()

  if (accessToken) {
    request.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return request
}

async function handleRequestError(error: {
  config?: InternalAxiosRequestConfig
  response?: { status?: number; headers?: { get(name: string): unknown } }
}) {
  const request = error.config as AuthRequest | undefined

  if (error.response?.status !== 401 || !request) {
    throw error
  }

  if (error.response.headers?.get('X-Auth-Required') === 'true') {
    clearAccessToken()
    if (window.location.pathname !== LOGIN_PATH) {
      window.location.replace(LOGIN_PATH)
    }
    throw error
  }

  if (!isAuthenticatedRequest(request)) throw error

  if (request.retried) {
    throw error
  }

  request.retried = true

  try {
    let accessToken = getAccessToken()
    const requestToken = request.headers.get('Authorization')

    // 다른 요청이 이미 토큰을 갱신했으면 저장된 새 토큰을 사용합니다.
    if (!accessToken || requestToken === `Bearer ${accessToken}`) {
      accessToken = await refreshAccessToken()
    }

    request.headers.set('Authorization', `Bearer ${accessToken}`)
    return await apiClient(request)
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

apiClient.interceptors.request.use(attachAccessToken)
apiClient.interceptors.response.use((response) => response, handleRequestError)
