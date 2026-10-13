import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { ITEM_ERRORS } from '@/constants/errors/item'

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

  const backendRequestUrl = new URL(`${BACKEND_URL}/users/me/liked-items`)
  backendRequestUrl.searchParams.set('size', '10')
  const cursor = new URL(request.url).searchParams.get('cursor')
  if (cursor !== null) backendRequestUrl.searchParams.set('cursor', cursor)

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
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: ITEM_ERRORS.LIKED_ITEMS_LOAD_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
