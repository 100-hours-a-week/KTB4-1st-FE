'use client'

import { useMemo, useRef, useState, type PointerEvent } from 'react'
import type { ItemDetail } from '@/types/item'
import styles from './ItemDetailImageContainer.module.css'

type ItemImageCarouselProps = {
  images?: ItemDetail['images']
  title?: string
  initialImageId?: number
  className?: string
  onActivate?: (imageId: number) => void
}

export default function ItemImageCarousel({
  images,
  title,
  initialImageId,
  className,
  onActivate,
}: ItemImageCarouselProps) {
  const sortedImages = useMemo(
    () =>
      images?.toSorted(
        (first, second) => first.displayOrder - second.displayOrder,
      ) ?? [],
    [images],
  )
  const [activeImageId, setActiveImageId] = useState<number | null>(
    initialImageId ?? null,
  )
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const suppressClick = useRef(false)
  const gesture = useRef<{
    pointerId: number
    startX: number
    startY: number
    width: number
    deltaX: number
    axis: 'horizontal' | 'vertical' | null
  } | null>(null)
  const activeIndex = Math.max(
    0,
    sortedImages.findIndex((image) => image.imageId === activeImageId),
  )

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (
      event.button !== 0 ||
      !event.isPrimary ||
      gesture.current ||
      !sortedImages.length
    )
      return

    suppressClick.current = false
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: event.currentTarget.clientWidth,
      deltaX: 0,
      axis: null,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return

    const deltaX = event.clientX - current.startX
    const deltaY = event.clientY - current.startY
    if (!current.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6) {
      current.axis =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }
    if (current.axis !== 'horizontal') return

    current.deltaX = deltaX
    const isOutside =
      (activeIndex === 0 && deltaX > 0) ||
      (activeIndex === sortedImages.length - 1 && deltaX < 0)
    const limit = current.width * (isOutside ? 0.22 : 1)
    setIsDragging(true)
    setDragOffset(
      Math.max(-limit, Math.min(limit, deltaX * (isOutside ? 0.3 : 1))),
    )
  }

  function finishGesture(
    event: PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return

    if (
      !cancelled &&
      current.axis === 'horizontal' &&
      Math.abs(current.deltaX) >= Math.min(80, current.width * 0.2)
    ) {
      const nextIndex = Math.max(
        0,
        Math.min(
          sortedImages.length - 1,
          activeIndex + (current.deltaX < 0 ? 1 : -1),
        ),
      )
      setActiveImageId(sortedImages[nextIndex].imageId)
    }
    suppressClick.current = cancelled || current.axis !== null
    gesture.current = null
    setIsDragging(false)
    setDragOffset(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div
      className={`${styles.viewport} ${className ?? ''}`}
      role="region"
      aria-label="물품 사진"
      tabIndex={sortedImages.length ? 0 : -1}
      onClick={() => {
        if (!suppressClick.current && sortedImages[activeIndex]) {
          onActivate?.(sortedImages[activeIndex].imageId)
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onLostPointerCapture={(event) => finishGesture(event, true)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onActivate) {
          event.preventDefault()
          if (sortedImages[activeIndex])
            onActivate(sortedImages[activeIndex].imageId)
          return
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        if (!sortedImages.length || gesture.current) return
        event.preventDefault()
        const nextIndex = Math.max(
          0,
          Math.min(
            sortedImages.length - 1,
            activeIndex + (event.key === 'ArrowRight' ? 1 : -1),
          ),
        )
        setActiveImageId(sortedImages[nextIndex].imageId)
      }}
    >
      <div
        className={styles.imageTrack}
        style={{
          transform: `translateX(calc(${-activeIndex * 100}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {sortedImages.map((image, index) => (
          <div
            className={styles.slide}
            key={image.imageId}
            aria-hidden={index !== activeIndex}
          >
            {/* 고정 영역 안에서 원본 비율을 유지합니다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.itemImage}
              src={image.imageUrl}
              alt={title ?? '물품 사진'}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
