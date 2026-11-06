export type MessageRefineErrorCode =
  | 'REQUEST_VALIDATION_FAILED'
  | 'AUTHENTICATION_REQUIRED'
  | 'USER_PREFERENCE_NOT_FOUND'
  | 'AI_MESSAGE_REFINE_FAILED'
  | 'INTERNAL_SERVER_ERROR'

export type MessageRefineResponse = {
  data: { refined_message: string } | null
  error: {
    code: MessageRefineErrorCode
    message: string
    details: { field: string; reason: string }[]
  } | null
}
