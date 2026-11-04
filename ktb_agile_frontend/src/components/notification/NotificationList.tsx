'use client'

import axios from 'axios'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { fetchNotifications } from '@/api/notification'
import {
  getAccessTokenOrRedirect,
  getUserIdFromAccessToken,
} from '@/utils/auth'
import { NOTIFICATION_ERRORS } from '@/constants/errors/notification'
import type { NotificationPageResponse } from '@/types/notification'
import NotificationContainer from './NotificationContainer'
import styles from './NotificationList.module.css'

export default function NotificationList() {
  const router = useRouter()
  const token =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem('accessToken')
  const query = useInfiniteQuery({
    queryKey: [
      'notifications',
      token ? (getUserIdFromAccessToken(token) ?? token) : null,
    ],
    enabled: Boolean(token),
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) => {
      const accessToken = getAccessTokenOrRedirect(router)
      if (!accessToken) throw new Error('로그인이 필요합니다.')
      return fetchNotifications({ accessToken, cursor: pageParam, signal })
    },
    getNextPageParam: (page) =>
      page.hasNext && page.nextCursor ? page.nextCursor : undefined,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
  const seen = new Set<number>()
  const notifications = (
    query.data?.pages.flatMap((page) => page.notifications) ?? []
  ).filter((item) => {
    if (seen.has(item.notificationId)) return false
    seen.add(item.notificationId)
    return true
  })
  const errorMessage = axios.isAxiosError<NotificationPageResponse>(query.error)
    ? query.error.response?.data?.error?.message ||
      NOTIFICATION_ERRORS.LIST_LOAD_FAILED
    : query.error?.message || NOTIFICATION_ERRORS.LIST_LOAD_FAILED

  return (
    <>
      {notifications.length > 0 && (
        <ul
          className={styles.list}
          aria-label="알림 목록"
          aria-busy={query.isFetching}
        >
          {notifications.map((notification) => (
            <NotificationContainer
              key={notification.notificationId}
              notification={notification}
            />
          ))}
        </ul>
      )}
      {query.isFetching && (
        <p className={styles.helper} role="status">
          알림을 불러오는 중입니다.
        </p>
      )}
      {query.isError && (
        <p className={`${styles.helper} ${styles.error}`} role="alert">
          {errorMessage}
        </p>
      )}
      {!query.isPending && !query.isError && notifications.length === 0 && (
        <p className={styles.helper}>아직 알림이 없습니다.</p>
      )}
      {query.hasNextPage && !query.isError && (
        <button
          type="button"
          className={styles.more}
          disabled={query.isFetching}
          onClick={() => {
            void query.fetchNextPage()
          }}
        >
          더 보기
        </button>
      )}
    </>
  )
}
