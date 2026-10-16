import { EXCHANGE_STATUS } from './exchange'

export const CHAT_MESSAGE_TYPE = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM',
} as const

export const CHAT_ROOM_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const

export const CHAT_EXCHANGE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
  CLOSED: 'CLOSED',
} as const

export const CHAT_EXCHANGE_STATUS_LABEL = {
  [EXCHANGE_STATUS.PENDING]: '거래 가능',
  [EXCHANGE_STATUS.COMPLETED]: '거래 완료',
  [EXCHANGE_STATUS.REJECTED]: '거래 거절',
  [EXCHANGE_STATUS.CANCELED]: '제안 취소',
  [CHAT_ROOM_STATUS.CLOSED]: '채팅 종료',
} as const
