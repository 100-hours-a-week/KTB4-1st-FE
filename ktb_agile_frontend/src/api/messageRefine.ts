import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { MESSAGE_REFINE_ERRORS } from '@/constants/errors/messageRefine'
import type { MessageRefineResponse } from '@/types/messageRefine'

export const MESSAGE_REFINE_MAX_LENGTH = 500

type RefineMessageParams = {
  accessToken: string
  message: string
  signal?: AbortSignal
}

export async function refineMessage({
  accessToken,
  message,
  signal,
}: RefineMessageParams) {
  const response = await axios.post<MessageRefineResponse>(
    `${API_BASE_URL}/message-refine/refine`,
    { message },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal,
    },
  )
  if (response.data.error || !response.data.data) {
    throw new Error(
      response.data.error?.message || MESSAGE_REFINE_ERRORS.REFINE_FAILED,
    )
  }
  return response.data.data.refined_message
}

export function getRefineErrorMessage(cause: unknown) {
  if (axios.isAxiosError<MessageRefineResponse>(cause)) {
    return (
      cause.response?.data?.error?.message ||
      MESSAGE_REFINE_ERRORS.REFINE_FAILED
    )
  }
  return cause instanceof Error
    ? cause.message
    : MESSAGE_REFINE_ERRORS.REFINE_FAILED
}
