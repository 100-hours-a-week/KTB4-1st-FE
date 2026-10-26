import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value

  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refresh_token=${refreshToken || ''}`,
      },
      cache: 'no-store',
    })

    const headers = new Headers({ 'Cache-Control': 'no-store' })
    for (const cookie of response.headers.getSetCookie()) {
      headers.append('Set-Cookie', cookie)
    }

    return Response.json(await response.json(), {
      status: response.status,
      headers,
    })
  } catch {
    return Response.json(
      { data: null, error: { message: AUTH_ERRORS.AUTH_SERVER_UNAVAILABLE } },
      { status: 502 },
    )
  }
}
