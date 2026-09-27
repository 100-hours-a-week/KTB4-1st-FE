// 배포 환경에서는 Nginx가 /api 요청을 백엔드로 전달합니다.
// NEXT_PUBLIC_API_BASE_URL을 지정하면 환경별 기본 주소보다 우선합니다.
const defaultApiBaseUrl =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://127.0.0.1:8080'

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || defaultApiBaseUrl
).replace(/\/+$/, '')
