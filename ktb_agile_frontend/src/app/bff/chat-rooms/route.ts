import { AUTH_ERRORS } from '@/constants/errors/auth'
import { CHAT_ERRORS } from '@/constants/errors/chat'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization) {
    return Response.json(
      { data: null, error: { message: AUTH_ERRORS.LOGIN_REQUIRED } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const requestParams = new URL(request.url).searchParams
  const backendRequestUrl = new URL(`${backendUrl}/chat-rooms`)
  for (const key of ['size', 'direction', 'cursor']) {
    const value = requestParams.get(key)
    if (value !== null) backendRequestUrl.searchParams.set(key, value)
  }

  try {
    const response = await fetch(backendRequestUrl, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })

    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { data: null, error: { message: CHAT_ERRORS.SERVER_UNAVAILABLE } },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
