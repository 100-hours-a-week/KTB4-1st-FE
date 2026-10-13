import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { SEARCH_ERRORS } from '@/constants/errors/search'

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
          message: SEARCH_ERRORS.HISTORY_ID_INVALID,
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/search-histories/${searchHistoryId}`,
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
          message: SEARCH_ERRORS.HISTORY_DELETE_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
