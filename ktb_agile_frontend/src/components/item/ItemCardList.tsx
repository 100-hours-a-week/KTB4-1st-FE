'use client'

import { useEffect, useState } from 'react'
import type { ItemListItem } from '@/types/item'
import ItemCard from './ItemCard'
import styles from './ItemCardList.module.css'

type ItemCardListProps = {
  items: ItemListItem[]
  isLoading?: boolean
  className?: string
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
}: ItemCardListProps) {
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

  if (!isReady) {
    return (
      <p className={styles.loading}>
        로딩 중 ...
      </p>
    )
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          className={styles.enter}
          key={item.itemId}
          style={{ animationDelay: `${index * ENTER_STAGGER_MS}ms` }}
        >
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  )
}
