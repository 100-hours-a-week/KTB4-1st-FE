'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ItemListItem } from '@/types/item'
import ItemCard from '@/components/common/item/ItemCard'
import styles from './ItemCardList.module.css'

type ItemCardListProps = {
  items: ItemListItem[]
  isLoading?: boolean
  isLoadingMore?: boolean
  className?: string
  onLoadMore?: () => void
}

export default function ItemCardList({
  items,
  isLoading = false,
  isLoadingMore = false,
  className,
  onLoadMore,
}: ItemCardListProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  // 로딩 상태만 바뀔 때 카드 JSX도 재사용합니다. 새 페이지가 오면 ref 위치도 갱신합니다.
  const cards = useMemo(
    () =>
      items.map((item, index) => (
        <div
          ref={index === Math.max(0, items.length - 7) ? triggerRef : undefined}
          key={item.itemId}
        >
          <ItemCard item={item} />
        </div>
      )),
    [items],
  )

  useEffect(() => {
    const target = triggerRef.current
    if (isLoading || !target || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.unobserve(target)
          onLoadMore()
        }
      },
      { threshold: 0, rootMargin: '600px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [isLoading, items, onLoadMore])

  if (isLoading) {
    return <p className={styles.loading}>로딩 중 ...</p>
  }

  return (
    <div className={className}>
      {cards}
      {isLoadingMore && (
        <div
          className={styles.skeleton}
          role="status"
          aria-label="다음 물품 불러오는 중"
        >
          <div className={styles.skeletonImage} aria-hidden="true" />
          <div className={styles.skeletonContent} aria-hidden="true">
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonMeta} />
            <div className={styles.skeletonBadge} />
          </div>
        </div>
      )}
    </div>
  )
}
