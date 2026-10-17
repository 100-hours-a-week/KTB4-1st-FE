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
