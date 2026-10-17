import { BACKEND_URL } from '@/config/backend'
import { CHAT_ERRORS } from '@/constants/errors/chat'
import { withAuth } from '@/utils/with-auth'

type RouteContext = {
  params: Promise<{ chatRoomId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  return withAuth(async (_request, authorization) => {
    const { chatRoomId } = await params
    if (!Number.isSafeInteger(Number(chatRoomId)) || Number(chatRoomId) < 1) {
      return Response.json(
        {
          data: null,
          error: {
            code: 'BAD_REQUEST',
            message: CHAT_ERRORS.ROOM_ID_INVALID,
            details: [],
          },
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/chat-rooms/${encodeURIComponent(chatRoomId)}`,
        {
          headers: { Authorization: authorization, Accept: 'application/json' },
          cache: 'no-store',
        },
      )

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
            message: CHAT_ERRORS.ROOM_DETAIL_LOAD_FAILED,
            details: [],
          },
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  })(request)
}
