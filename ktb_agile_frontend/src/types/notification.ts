export type Notification = {
  notificationId: number
  text: string
  createdAt: string
}

export type NotificationPageResponse = {
  data: {
    notifications: Notification[]
    nextCursor: string | null
    hasNext: boolean
  } | null
  error: { code: string; message: string; details: unknown[] } | null
}
