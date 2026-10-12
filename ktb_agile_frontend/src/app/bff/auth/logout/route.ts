import { AUTH_ERRORS } from '@/constants/errors/auth'
import type { AuthErrorResponse } from '@/types/auth'
import type { NextRequest } from 'next/server'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: AUTH_ERRORS.LOGIN_REQUIRED,
          details: [],
        },
      } satisfies AuthErrorResponse,
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const refreshToken = request.cookies.get('refresh_token')?.value

  try {
    const response = await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        Cookie: `refresh_token=${refreshToken || ''}`,
      },
      cache: 'no-store',
    })

    const headers = new Headers({ 'Cache-Control': 'no-store' })
    const setCookie = response.headers.get('Set-Cookie')
    if (setCookie) headers.set('Set-Cookie', setCookie)

    if (response.status === 204) {
      return new Response(null, { status: 204, headers })
    }

    const contentType = response.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)

    return new Response(await response.text(), {
      status: response.status,
      headers,
    })
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: '로그아웃 처리 중 서버에 연결하지 못했습니다.',
          details: [],
        },
      } satisfies AuthErrorResponse,
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
