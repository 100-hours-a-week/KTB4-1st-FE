'use client'

import { useEffect, useRef, useState } from 'react'
import type { ItemListItem } from '@/types/item'
import ItemCard from '@/components/common/item/ItemCard'
import styles from './ItemCardList.module.css'

type ItemCardListProps = {
  items: ItemListItem[]
  isLoading?: boolean
  className?: string
  onLoadMore?: () => void
  onReady?: () => void | (() => void)
  skipEnterAnimation?: boolean
}

const ENTER_STAGGER_MS = 80

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = url
  })
}

export default function ItemCardList({
  items,
  isLoading = false,
  className,
  onLoadMore,
  onReady,
  skipEnterAnimation = false,
}: ItemCardListProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [preloadedItems, setPreloadedItems] = useState<ItemListItem[] | null>(
    null,
  )

  useEffect(() => {
    if (isLoading) return

    let isActive = true
    const urls = items.flatMap((item) =>
      item.thumbnailImageUrl ? [item.thumbnailImageUrl] : [],
    )

    Promise.all(urls.map(preloadImage)).then(() => {
      if (isActive) setPreloadedItems(items)
    })

    return () => {
      isActive = false
    }
  }, [items, isLoading])

  const isReady = !isLoading && preloadedItems === items

  useEffect(() => {
    if (isReady) return onReady?.()
  }, [isReady, onReady])

  useEffect(() => {
    const target = triggerRef.current
    if (!isReady || !target || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.unobserve(target)
          onLoadMore()
        }
      },
      { threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [isReady, items, onLoadMore])

  if (isLoading || !preloadedItems) {
    return <p className={styles.loading}>로딩 중 ...</p>
  }

  return (
    <div className={className}>
      {preloadedItems.map((item, index) => (
        <div
          ref={index === Math.max(0, items.length - 3) ? triggerRef : undefined}
          className={skipEnterAnimation ? undefined : styles.enter}
          key={item.itemId}
          style={{ animationDelay: `${index * ENTER_STAGGER_MS}ms` }}
        >
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  )
}
