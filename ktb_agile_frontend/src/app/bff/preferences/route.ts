import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { PREFERENCE_ERRORS } from '@/constants/errors/preference'

function unauthorized() {
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

function unavailable() {
  return Response.json(
    {
      data: null,
      error: {
        code: 'BAD_GATEWAY',
        message: PREFERENCE_ERRORS.REQUEST_FAILED,
        details: [],
      },
    },
    { status: 502, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return unauthorized()

  try {
    const response = await fetch(`${BACKEND_URL}/users/preferences`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })
    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return unavailable()
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return unauthorized()

  try {
    const response = await fetch(`${BACKEND_URL}/users/preferences`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: await request.text(),
      cache: 'no-store',
    })
    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return unavailable()
  }
}
