export type ChatbotMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatbotAskRequest = {
  message: string
  history?: ChatbotMessage[]
}

  export type ChatbotAction = {
    label: string
    screen:
      | 'MY_PAGE'
      | 'ITEM_LIST'
      | 'ITEM_ADD'
      | 'CHAT_LIST'
      | 'GROUP_MANAGE'
      | 'INTEREST_LIST'
      | 'INQUIRY'
  }

export type ChatbotAskResponse = {
  data: { answer: string; action: ChatbotAction | null } | null
  error: {
    code: string
    message: string
    details: { field: string; reason: string }[]
  } | null
}
