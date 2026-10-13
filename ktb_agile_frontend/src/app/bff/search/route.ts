import { BACKEND_URL } from '@/config/backend'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import { SEARCH_ERRORS } from '@/constants/errors/search'

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

  const params = new URL(request.url).searchParams
  const groupId = params.get('groupId')
  const keyword = params.get('keyword')?.trim() ?? ''
  const itemState = params.get('itemState')
  if (
    !groupId ||
    !/^[1-9]\d*$/.test(groupId) ||
    !Number.isSafeInteger(Number(groupId))
  ) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: SEARCH_ERRORS.GROUP_REQUIRED,
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (keyword.length > 255) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: SEARCH_ERRORS.KEYWORD_TOO_LONG,
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  if (
    itemState !== null &&
    itemState !== 'AVAILABLE' &&
    itemState !== 'UNAVAILABLE'
  ) {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: SEARCH_ERRORS.ITEM_STATE_INVALID,
          details: [],
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const url = new URL(`${BACKEND_URL}/items`)
  url.searchParams.set('groupId', groupId)
  url.searchParams.set('keyword', keyword)
  if (itemState !== null) url.searchParams.set('itemState', itemState)
  const cursor = params.get('cursor')
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
          message: SEARCH_ERRORS.RESULTS_LOAD_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
