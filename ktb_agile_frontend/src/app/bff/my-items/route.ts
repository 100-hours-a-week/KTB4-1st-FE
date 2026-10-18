import { BACKEND_URL } from '@/config/backend'
import { ITEM_ERRORS } from '@/constants/errors/item'
import { withAuth } from '@/utils/with-auth'

async function getMyItems(request: Request, authorization: string) {
  const backendRequestUrl = new URL(`${BACKEND_URL}/users/me/items`)
  backendRequestUrl.searchParams.set('size', '10')
  const searchParams = new URL(request.url).searchParams
  const groupId = searchParams.get('groupId')
  if (groupId !== null) backendRequestUrl.searchParams.set('groupId', groupId)
  const cursor = searchParams.get('cursor')
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
          message: ITEM_ERRORS.MY_ITEMS_LOAD_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export const GET = withAuth(getMyItems)
