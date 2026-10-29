'use client'

import { useState } from 'react'
import type { ItemDetail } from '@/types/item'
import ItemImageCarousel from './ItemImageCarousel'
import ImageDetailsModal from './ImageDetailsModal'
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
  const [expandedImageId, setExpandedImageId] = useState<number | null>(null)

  return (
    <>
      <div className={styles.imageArea}>
        <ItemImageCarousel
          images={images}
          title={title}
          onActivate={setExpandedImageId}
        />
        <button className={styles.backButton} type="button" onClick={onBack}>
          ‹
        </button>
        {!images?.length && !isLoading && (
          <svg className={styles.placeholderIcon} viewBox="0 0 24 24">
            <rect x="3.5" y="4" width="17" height="16" rx="2" />
            <circle cx="9" cy="9.5" r="1.5" />
            <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
          </svg>
        )}
      </div>
      {expandedImageId !== null && (
        <ImageDetailsModal
          images={images}
          title={title}
          initialImageId={expandedImageId}
          onClose={() => setExpandedImageId(null)}
        />
      )}
    </>
  )
}
