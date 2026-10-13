import { withAuth } from '@/utils/with-auth'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

async function getLikedItems(request: Request, authorization: string) {
  const backendRequestUrl = new URL(`${backendUrl}/users/me/liked-items`)
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
          message: '관심 물품 목록을 불러오지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export const GET = withAuth(getLikedItems)
