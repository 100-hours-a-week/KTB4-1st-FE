'use client'

import { useMemo, useState } from 'react'
import type { ItemDetail } from '@/types/item'
import { isSameImagePath } from '@/utils/itemDetailPreview'
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
  /** 목록에서 클릭과 동시에 요청한 첫 사진의 상세용 썸네일 주소. */
  initialImageUrl?: string | null
}

export default function ItemDetailImageContainer({
  images,
  title,
  isLoading,
  onBack,
  placeholderImageUrl,
  thumbnailImageId,
  initialImageUrl,
}: ItemDetailImageContainerProps) {
  const [expandedImageId, setExpandedImageId] = useState<number | null>(null)
  // 성공·실패와 관계없이 요청이 끝난 사진입니다. 다음 사진과 원본 준비에 사용합니다.
  const [settledThumbnailUrls, setSettledThumbnailUrls] = useState<Set<string>>(
    () => new Set(),
  )
  // 실제로 그려진 사진입니다. 실패를 성공으로 보고 임시 이미지를 지우지 않기 위해 따로 둡니다.
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(
    () => new Set(),
  )
  // 미리 받은 주소(A)가 어느 경로에서든 실패하면 상세 응답의 주소(B)로 되돌아갑니다.
  const [isInitialImageFailed, setIsInitialImageFailed] = useState(false)
  const usableInitialImageUrl = isInitialImageFailed ? null : initialImageUrl
  const detailImages = useMemo(() => {
    const firstImageId = images?.toSorted(
      (first, second) => first.displayOrder - second.displayOrder,
    )[0]?.imageId
    return images?.map((image) => {
      const detailUrl = image.detailThumbnailUrl || image.imageUrl
      // 서명 값만 다른 같은 사진이면 미리 받은 주소를 유지해 다시 받지 않습니다.
      const keepsInitialImage =
        !!usableInitialImageUrl &&
        image.imageId === firstImageId &&
        isSameImagePath(usableInitialImageUrl, detailUrl)
      return {
        ...image,
        imageUrl: keepsInitialImage ? usableInitialImageUrl : detailUrl,
      }
    })
  }, [images, usableInitialImageUrl])
  const canPreloadOriginals =
    !!detailImages?.length &&
    detailImages.every((image) => settledThumbnailUrls.has(image.imageUrl))
  const firstImage = detailImages?.toSorted(
    (first, second) => first.displayOrder - second.displayOrder,
  )[0]
  const isFirstImageLoaded =
    !!firstImage && loadedImageUrls.has(firstImage.imageUrl)

  // 위층: 클릭할 때 요청한 상세용 썸네일(A). 받는 동안은 투명해 아래층이 보입니다.
  const isInitialImageLoaded =
    !!usableInitialImageUrl && loadedImageUrls.has(usableInitialImageUrl)
  const showInitialLayer =
    !!usableInitialImageUrl &&
    (!firstImage || firstImage.imageUrl === usableInitialImageUrl) &&
    !isFirstImageLoaded
  // 아래층: 목록에서 이미 받은 224px 썸네일. 선명한 사진이 그려지기 전까지 보여 줍니다.
  const isListThumbnailSameImage =
    !firstImage ||
    thumbnailImageId == null ||
    thumbnailImageId === firstImage.imageId
  const showListThumbnailLayer =
    !!placeholderImageUrl &&
    (isLoading || !!firstImage) &&
    isListThumbnailSameImage &&
    !isFirstImageLoaded &&
    !(showInitialLayer && isInitialImageLoaded)

  function markLoaded(url: string) {
    setLoadedImageUrls((urls) =>
      urls.has(url) ? urls : new Set(urls).add(url),
    )
  }

  function handleImageError(url: string) {
    if (url === usableInitialImageUrl) setIsInitialImageFailed(true)
  }

  return (
    <>
      <div className={styles.imageArea}>
        {showListThumbnailLayer && (
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
        {showInitialLayer && (
          // 목록 썸네일 위에 겹쳐, 받아지는 순간 선명한 사진으로 덮습니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.placeholderImage}
            src={usableInitialImageUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            onLoad={() => markLoaded(usableInitialImageUrl)}
            onError={() => handleImageError(usableInitialImageUrl)}
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
          onImageLoad={markLoaded}
          onImageError={handleImageError}
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
