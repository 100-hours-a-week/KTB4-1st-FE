import type { ChatbotAction } from '@/types/chatbot'

export const CHATBOT_ROUTE = {
  MY_PAGE: '/pages/my',
  ITEM_LIST: '/pages/items',
  ITEM_ADD: '/pages/items/register',
  CHAT_LIST: '/pages/chat',
  GROUP_MANAGE: '/pages/groups',
  INTEREST_LIST: '/pages/my/likedItem',
  INQUIRY: null,
} as const satisfies Record<ChatbotAction['screen'], string | null>

export const CHATBOT_SCREEN_LABEL = {
  MY_PAGE: '마이페이지',
  ITEM_LIST: '물품 목록',
  ITEM_ADD: '물품 등록',
  CHAT_LIST: '채팅 목록',
  GROUP_MANAGE: '그룹 관리',
  INTEREST_LIST: '관심 물품 목록',
  INQUIRY: '문의하기',
} as const satisfies Record<ChatbotAction['screen'], string>
