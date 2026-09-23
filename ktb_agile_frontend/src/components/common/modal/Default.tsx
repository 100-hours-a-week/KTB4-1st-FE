'use client'

import styles from './Default.module.css'

type ModalDefaultProps = {
  message: string
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
}

export default function ModalDefault({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = '취소',
}: ModalDefaultProps) {
  const resolvedConfirmLabel = confirmLabel ?? (onCancel ? '예' : '확인')

  return (
    <div className={styles.overlay}>
      <section className={styles.modal}>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttonGroup}>
          {onCancel && (
            <button
              className={styles.cancelButton}
              type="button"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            className={styles.confirmButton}
            type="button"
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
