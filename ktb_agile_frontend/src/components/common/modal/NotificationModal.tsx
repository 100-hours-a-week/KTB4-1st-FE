'use client'

import { useEffect, useId, useRef } from 'react'
import NotificationList from '@/components/notification/NotificationList'
import styles from './NotificationModal.module.css'

type NotificationModalProps = {
  onClose: () => void
}

export default function NotificationModal({ onClose }: NotificationModalProps) {
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
          <NotificationList />
        </div>
      </div>
    </dialog>
  )
}
