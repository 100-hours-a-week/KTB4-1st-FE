import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'

export async function GET(request: Request) {
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
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })

    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: '프로필 정보를 불러오지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function DELETE(request: Request) {
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
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      method: 'DELETE',
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    const contentType = response.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)
    for (const cookie of response.headers.getSetCookie()) {
      headers.append('Set-Cookie', cookie)
    }

    return new Response(
      response.status === 204 ? null : await response.text(),
      {
        status: response.status,
        headers,
      },
    )
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: '회원 탈퇴 요청을 처리하지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
