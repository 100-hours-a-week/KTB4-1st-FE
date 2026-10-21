import type { CHAT_ROOM_STATUS, CHAT_EXCHANGE_STATUS } from '@/constants/chat'
import type { EXCHANGE_STATUS } from '@/constants/exchange'
import type { GROUP_MEMBER_STATUS, USER_STATUS } from '@/constants/user'

export type ChatRoom = {
  chatRoomId: number
  chatRoomStatus: (typeof CHAT_ROOM_STATUS)[keyof typeof CHAT_ROOM_STATUS]
  exchangeStatus: (typeof EXCHANGE_STATUS)[keyof typeof EXCHANGE_STATUS]
  exchangeRequestId: number
  direction: 'SENT' | 'RECEIVED'
  group: { groupId: number; groupName: string } | null
  otherUser: {
    userId: number
    nickname: string
    userStatus: (typeof USER_STATUS)[keyof typeof USER_STATUS]
    groupMemberStatus:
      (typeof GROUP_MEMBER_STATUS)[keyof typeof GROUP_MEMBER_STATUS] | null
  }
  targetItem: {
    itemId: number
    title: string
    thumbnailImageUrl: string | null
  }
  offeredItem: {
    itemId: number
    title: string
    thumbnailImageUrl: string | null
  }
  lastMessage: {
    messageId: number
    content: string
    senderId: number | null
    createdAt: string
  } | null
  unreadMessageCount: number
  lastMessageAt: string
}

export type ChatRoomResponse = {
  data: { chatRooms: ChatRoom[]; nextCursor: string | null; hasNext: boolean }
  error: {
    code: string
    message: string
    details: { field: string; reason: string }[]
  } | null
}

export type ChatRoomDetail = {
  chatRoomId: number
  chatRoomStatus: ChatRoom['chatRoomStatus']
  exchangeRequest: {
    exchangeRequestId: number
    exchangeStatus: ChatRoom['exchangeStatus']
    requestedItem: {
      itemId: number
      title: string
      availableQuantity: number
      thumbnailImageUrl: string | null
    }
    requestedQuantity: number
    offeredItems: {
      itemId: number
      title: string
      offeredQuantity: number
      availableQuantity: number
      thumbnailImageUrl: string | null
    }[]
  }
}

export type ChatRoomDetailResponse = {
  data: ChatRoomDetail | null
  error: ChatRoomResponse['error']
}

export type ChatExchangeStatus =
  (typeof CHAT_EXCHANGE_STATUS)[keyof typeof CHAT_EXCHANGE_STATUS]

export type ExchangeActionStatus =
  typeof EXCHANGE_STATUS.COMPLETED | typeof EXCHANGE_STATUS.REJECTED

export type ExchangeUpdateStatus = Exclude<
  ChatRoom['exchangeStatus'],
  typeof EXCHANGE_STATUS.PENDING
>
