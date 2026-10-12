import { AUTH_ERRORS } from '@/constants/errors/auth'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

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

  const url = new URL(`${backendUrl}/search-histories`)
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
    const response = await fetch(`${backendUrl}/search-histories`, {
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
