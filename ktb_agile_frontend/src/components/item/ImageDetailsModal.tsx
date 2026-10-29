'use client'

import { useEffect, useRef } from 'react'
import type { ItemDetail } from '@/types/item'
import ItemImageCarousel from './ItemImageCarousel'
import styles from './ImageDetailsModal.module.css'

type ImageDetailsModalProps = {
  images?: ItemDetail['images']
  title?: string
  initialImageId: number
  onClose: () => void
}

export default function ImageDetailsModal({
  images,
  title,
  initialImageId,
  onClose,
}: ImageDetailsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'

    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-label="물품 사진 확대"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <ItemImageCarousel
        images={images}
        title={title}
        initialImageId={initialImageId}
        className={styles.viewport}
      />
      <button
        className={styles.closeButton}
        type="button"
        aria-label="사진 확대 닫기"
        onClick={onClose}
        autoFocus
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </dialog>
  )
}
