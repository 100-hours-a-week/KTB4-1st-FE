import type { CHAT_MESSAGE_TYPE } from '@/constants/chat'
import type { ChatRoom, ChatRoomDetail, ChatRoomResponse } from './chatRoom'

export type ChatMessageType =
  (typeof CHAT_MESSAGE_TYPE)[keyof typeof CHAT_MESSAGE_TYPE]

export type ChatMessageDto = {
  messageId: number
  chatRoomId: number
  userId: number | null
  content: string
  messageType: ChatMessageType
  createdAt: string
  userStatus: ChatRoom['otherUser']['userStatus'] | null
  groupMemberStatus: ChatRoom['otherUser']['groupMemberStatus']
  payload:
    | (Omit<ChatRoomDetail['exchangeRequest'], 'exchangeStatus'> & {
        eventType: 'EXCHANGE_REQUEST_CREATED'
      })
    | null
}

export type ChatMessageResponse = {
  data: {
    messages: ChatMessageDto[]
    nextCursor: string | null
    hasNext: boolean
  } | null
  error: ChatRoomResponse['error']
}
