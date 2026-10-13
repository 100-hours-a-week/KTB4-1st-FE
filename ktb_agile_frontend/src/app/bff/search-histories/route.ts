import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'

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

export async function GET(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return unauthorized()

  const url = new URL(`${BACKEND_URL}/search-histories`)
  const cursor = new URL(request.url).searchParams.get('cursor')
  if (cursor !== null) url.searchParams.set('cursor', cursor)

  try {
    const response = await fetch(url, {
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
          message: '검색 기록을 가져오는데 실패했습니다',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function DELETE(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return unauthorized()

  try {
    const response = await fetch(`${BACKEND_URL}/search-histories`, {
      method: 'DELETE',
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
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
          message: '전체 검색 기록을 삭제하지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
