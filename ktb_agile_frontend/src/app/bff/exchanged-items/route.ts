import { BACKEND_URL } from '@/config/backend'
import { EXCHANGE_ERRORS } from '@/constants/errors/exchange'
import { withAuth } from '@/utils/with-auth'

async function getExchangedItems(request: Request, authorization: string) {
  const backendRequestUrl = new URL(`${BACKEND_URL}/users/me/exchanged-items`)
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
          message: EXCHANGE_ERRORS.EXCHANGED_ITEMS_LOAD_FAILED,
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export const GET = withAuth(getExchangedItems)
