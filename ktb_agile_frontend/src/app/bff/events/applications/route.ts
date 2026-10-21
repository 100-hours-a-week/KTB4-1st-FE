import { BACKEND_URL } from '@/config/backend'
import type { ChatRoom, ChatRoomResponse } from '@/types/chatRoom'
import { withAuth } from '@/utils/with-auth'
import {
  EVENT_PHOTO_MAX_BYTES,
  EVENT_PHOTO_TYPES,
  EventConfigurationError,
  saveEventApplication,
} from '@/server/eventApplications'

export const runtime = 'nodejs'

function failure(message: string, status: number) {
  return Response.json(
    { data: null, error: { message } },
    {
      status,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}

// 이름·교환 상태는 클라이언트 입력 대신 로그인 사용자의 실제 채팅방에서 확인합니다.
async function findRoom(
  chatRoomId: number,
  authorization: string,
): Promise<ChatRoom | null> {
  let cursor: string | null = null
  const visited = new Set<string>()
  do {
    const url = new URL(`${BACKEND_URL}/chat-rooms`)
    url.searchParams.set('size', '20')
    if (cursor) url.searchParams.set('cursor', cursor)
    const response = await fetch(url, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error('채팅방 조회 실패')
    const result = (await response.json()) as ChatRoomResponse
    if (!result.data) throw new Error('채팅방 조회 실패')
    const room = result.data.chatRooms.find(
      (room) => room.chatRoomId === chatRoomId,
    )
    if (room) return room
    cursor = result.data.hasNext ? result.data.nextCursor : null
    if (cursor && visited.has(cursor)) throw new Error('채팅방 커서 오류')
    if (cursor) visited.add(cursor)
  } while (cursor)
  return null
}

export const POST = withAuth(async (request, authorization) => {
  const length = Number(request.headers.get('Content-Length'))
  if (length > EVENT_PHOTO_MAX_BYTES + 64 * 1024)
    return failure('사진은 10MB 이하로 등록해주세요.', 413)
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return failure('응모 요청 형식이 올바르지 않습니다.', 400)
  }
  const chatRoomId = Number(form.get('chatRoomId'))
  const exchangeRequestId = Number(form.get('exchangeRequestId'))
  const photo = form.get('photo')
  if (
    !Number.isSafeInteger(chatRoomId) ||
    chatRoomId < 1 ||
    !Number.isSafeInteger(exchangeRequestId) ||
    exchangeRequestId < 1
  ) {
    return failure('교환 정보가 올바르지 않습니다.', 400)
  }
  if (
    !(photo instanceof File) ||
    !EVENT_PHOTO_TYPES.includes(photo.type) ||
    photo.size === 0
  ) {
    return failure('JPG, PNG, WebP 사진을 등록해주세요.', 400)
  }
  if (photo.size > EVENT_PHOTO_MAX_BYTES)
    return failure('사진은 10MB 이하로 등록해주세요.', 413)
  try {
    const profile = await fetch(`${BACKEND_URL}/users/me`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (profile.status === 401 || profile.status === 403)
      return failure('다시 로그인해주세요.', 401)
    if (!profile.ok) throw new Error('사용자 조회 실패')
    const me = (await profile.json()) as { data: { nickname: string } | null }
    if (!me.data?.nickname) throw new Error('사용자 닉네임 없음')
    const room = await findRoom(chatRoomId, authorization)
    if (!room || room.exchangeRequestId !== exchangeRequestId)
      return failure('해당 교환에 응모할 권한이 없습니다.', 403)
    if (room.exchangeStatus !== 'COMPLETED')
      return failure('거래 완료 후에 응모할 수 있습니다.', 409)
    const isReceiver = room.direction === 'RECEIVED'
    const data = await saveEventApplication({
      exchangeRequestId,
      participant1: isReceiver ? me.data.nickname : room.otherUser.nickname,
      participant2: isReceiver ? room.otherUser.nickname : me.data.nickname,
      photo,
    })
    return Response.json(
      { data, error: null },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    if (error instanceof EventConfigurationError)
      return failure(
        '이벤트 연결 설정이 필요합니다. 운영자에게 문의해주세요.',
        503,
      )
    return failure(
      '응모를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
      502,
    )
  }
})
