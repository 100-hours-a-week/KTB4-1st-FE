'use client'

import { useEffect, useId, useRef } from 'react'
import styles from './NotificationModal.module.css'

export type NotificationItem = {
  id: string | number
  title: string
  message: string
  createdAt: string
  isRead?: boolean
}

type NotificationModalProps = {
  onClose: () => void
  notifications?: NotificationItem[]
}

export default function NotificationModal({
  onClose,
  notifications = [],
}: NotificationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'

    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose()
        }
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            알림
          </h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="알림 닫기"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className={styles.listContainer}>
          {notifications.length > 0 ? (
            <ul className={styles.list} aria-label="알림 목록">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`${styles.notification} ${notification.isRead ? '' : styles.unread}`}
                >
                  {!notification.isRead && (
                    <span className={styles.unreadLabel}>읽지 않음</span>
                  )}
                  <h3 className={styles.notificationTitle}>
                    {notification.title}
                  </h3>
                  <p className={styles.message}>{notification.message}</p>
                  <time
                    className={styles.time}
                    dateTime={notification.createdAt}
                  >
                    {new Date(notification.createdAt).toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
              <p>아직 알림이 없어요</p>
              <span>새로운 소식이 오면 여기에 표시돼요.</span>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
