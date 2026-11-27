import { apiClient } from '@/config/apiClient'
import { API_BASE_URL } from '@/config/api'
import { NOTIFICATION_ERRORS } from '@/constants/errors/notification'
import type { NotificationPageResponse } from '@/types/notification'

type FetchNotificationsParams = {
  cursor?: string
  size?: number
  signal?: AbortSignal
}

export async function fetchNotifications({
  cursor,
  size = 10,
  signal,
}: FetchNotificationsParams) {
  const response = await apiClient.get<NotificationPageResponse>(
    `${API_BASE_URL}/users/me/notifications`,
    {
      params: { size, ...(cursor ? { cursor } : {}) },
      headers: {
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
