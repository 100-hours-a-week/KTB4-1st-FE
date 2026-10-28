'use client'

import { useMemo } from 'react'
import type { ItemDetail } from '@/types/item'
import styles from './ItemDetailImageContainer.module.css'

type ItemDetailImageContainerProps = {
  images?: ItemDetail['images']
  title?: string
  isLoading: boolean
  onBack: () => void
}

export default function ItemDetailImageContainer({
  images,
  title,
  isLoading,
  onBack,
}: ItemDetailImageContainerProps) {
  const primaryImage = useMemo(
    () =>
      images?.toSorted(
        (first, second) => first.displayOrder - second.displayOrder,
      )[0],
    [images],
  )

  return (
    <div className={styles.imageArea}>
      {primaryImage && (
        // 고정된 이미지 영역 안에서 업로드 이미지의 원본 비율을 유지합니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.itemImage}
          src={primaryImage.imageUrl}
          alt={title ?? '물품 사진'}
        />
      )}
      <button className={styles.backButton} type="button" onClick={onBack}>
        ‹
      </button>
      {!primaryImage && !isLoading && (
        <svg className={styles.placeholderIcon} viewBox="0 0 24 24">
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <circle cx="9" cy="9.5" r="1.5" />
          <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
        </svg>
      )}
    </div>
  )
}
