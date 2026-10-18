'use client'

import styles from './Default.module.css'

type ModalDefaultProps = {
  message: string
  onConfirm?: () => void
  onCancel?: () => void
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  cancelDisabled?: boolean
}

export default function ModalDefault({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = '취소',
  confirmDisabled = false,
  cancelDisabled = false,
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
              disabled={cancelDisabled}
            >
              {cancelLabel}
            </button>
          )}
          <button
            className={styles.confirmButton}
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
