import { AUTH_ERRORS } from '@/constants/errors/auth'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

type RouteContext = {
  params: Promise<{ searchHistoryId: string }>
}

export async function DELETE(request: Request, { params }: RouteContext) {
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

  const { searchHistoryId } = await params
  if (
    !/^[1-9]\d*$/.test(searchHistoryId) ||
    !Number.isSafeInteger(Number(searchHistoryId))
  ) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: '검색 기록 ID가 올바르지 않습니다.',
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = await fetch(
      `${backendUrl}/search-histories/${searchHistoryId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
    )
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
          message: '검색 기록을 삭제하지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
