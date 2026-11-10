'use client'

import { useMemo, useState } from 'react'
import type { ItemDetail } from '@/types/item'
import ItemImageCarousel from './ItemImageCarousel'
import ImageDetailsModal from './ImageDetailsModal'
import styles from './ItemDetailImageContainer.module.css'

type ItemDetailImageContainerProps = {
  images?: ItemDetail['images']
  title?: string
  isLoading: boolean
  onBack: () => void
  /** 목록에서 이미 받은 대표 사진 썸네일. 첫 상세 사진이 뜰 때까지 대신 보여 줍니다. */
  placeholderImageUrl?: string | null
  /** 목록 썸네일이 가리키는 대표 사진 ID. 첫 사진과 다르면 자리 표시를 숨깁니다. */
  thumbnailImageId?: number | null
}

export default function ItemDetailImageContainer({
  images,
  title,
  isLoading,
  onBack,
  placeholderImageUrl,
  thumbnailImageId,
}: ItemDetailImageContainerProps) {
  const [expandedImageId, setExpandedImageId] = useState<number | null>(null)
  const [settledThumbnailUrls, setSettledThumbnailUrls] = useState<Set<string>>(
    () => new Set(),
  )
  const detailImages = useMemo(
    () =>
      images?.map((image) => ({
        ...image,
        imageUrl: image.detailThumbnailUrl || image.imageUrl,
      })),
    [images],
  )
  const canPreloadOriginals =
    !!detailImages?.length &&
    detailImages.every((image) => settledThumbnailUrls.has(image.imageUrl))
  const firstImage = detailImages?.toSorted(
    (first, second) => first.displayOrder - second.displayOrder,
  )[0]
  // 대표 사진이 첫 사진과 다르면 다른 사진이 비치지 않도록 자리 표시를 쓰지 않습니다.
  const isPlaceholderSameImage =
    !firstImage ||
    thumbnailImageId == null ||
    thumbnailImageId === firstImage.imageId
  const showPlaceholder =
    !!placeholderImageUrl &&
    (isLoading || !!firstImage) &&
    isPlaceholderSameImage &&
    !(firstImage && settledThumbnailUrls.has(firstImage.imageUrl))

  return (
    <>
      <div className={styles.imageArea}>
        {showPlaceholder && (
          // 브라우저 캐시에 있는 목록 썸네일이라 클릭 직후 바로 표시됩니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.placeholderImage}
            src={placeholderImageUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        <ItemImageCarousel
          images={detailImages}
          title={title}
          onActivate={setExpandedImageId}
          onImageSettled={(url) => {
            setSettledThumbnailUrls((urls) =>
              urls.has(url) ? urls : new Set(urls).add(url),
            )
          }}
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
      {canPreloadOriginals && (
        <div hidden aria-hidden="true">
          {images?.map((image) => (
            // 썸네일 요청이 모두 끝난 뒤 원본을 브라우저 캐시에 준비합니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.imageId}
              src={image.imageUrl}
              alt=""
              loading="eager"
              fetchPriority="low"
              decoding="async"
            />
          ))}
        </div>
      )}
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
