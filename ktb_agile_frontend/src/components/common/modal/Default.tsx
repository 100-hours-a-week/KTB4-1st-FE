'use client'

import { useId } from 'react'
import styles from './Default.module.css'

type ModalDefaultProps = {
  message: string
  onConfirm: () => void
  confirmLabel?: string
}

export default function ModalDefault({
  message,
  onConfirm,
  confirmLabel = '확인',
}: ModalDefaultProps) {
  const messageId = useId()

  return (
    <div className={styles.overlay}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-describedby={messageId}
      >
        <p id={messageId} className={styles.message}>
          {message}
        </p>
        <button
          className={styles.confirmButton}
          type="button"
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </section>
    </div>
  )
}
