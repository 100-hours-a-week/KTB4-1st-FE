import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { NOTIFICATION_ERRORS } from '@/constants/errors/notification'
import type { NotificationPageResponse } from '@/types/notification'

type FetchNotificationsParams = {
  accessToken: string
  cursor?: string
  size?: number
  signal?: AbortSignal
}

export async function fetchNotifications({
  accessToken,
  cursor,
  size = 10,
  signal,
}: FetchNotificationsParams) {
  const response = await axios.get<NotificationPageResponse>(
    `${API_BASE_URL}/users/me/notifications`,
    {
      params: { size, ...(cursor ? { cursor } : {}) },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal,
    },
  )
  if (response.data.error || !response.data.data) {
    throw new Error(
      response.data.error?.message || NOTIFICATION_ERRORS.LIST_LOAD_FAILED,
    )
  }
  return response.data.data
}
