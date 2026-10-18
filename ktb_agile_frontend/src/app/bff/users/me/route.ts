import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { USER_ERRORS } from '@/constants/errors/user'

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
          message: USER_ERRORS.PROFILE_LOAD_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
