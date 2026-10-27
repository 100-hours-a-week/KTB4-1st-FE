'use client'

import { useEffect, useRef } from 'react'
import type { ItemListItem } from '@/types/item'
import ItemCard from '@/components/common/item/ItemCard'
import styles from './ItemCardList.module.css'

type ItemCardListProps = {
  items: ItemListItem[]
  isLoading?: boolean
  className?: string
  onLoadMore?: () => void
}

export default function ItemCardList({
  items,
  isLoading = false,
  className,
  onLoadMore,
}: ItemCardListProps) {
  const triggerRef = useRef<HTMLDivElement>(null)

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
      {items.map((item, index) => (
        <div
          ref={index === Math.max(0, items.length - 3) ? triggerRef : undefined}
          key={item.itemId}
        >
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  )
}
