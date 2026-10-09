'use client'

import type { ItemListItem } from '@/types/item'
import ItemImage from './ItemImage'
import QuantityControl from './QuantityControl'
import styles from './ExchangeForm.module.css'

type OfferingItemCardProps = {
  item: Omit<ItemListItem, 'owner'>
  selected: boolean
  quantity: number
  disabled?: boolean
  onSelectionChange: (selected: boolean) => void
  onQuantityChange: (quantity: number) => void
}

export default function OfferingItemCard({
  item,
  selected,
  quantity,
  disabled = false,
  onSelectionChange,
  onQuantityChange,
}: OfferingItemCardProps) {
  const unavailable = item.itemState !== 'AVAILABLE' || item.quantity < 1

  return (
    <div className={styles.offerCard}>
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled || unavailable}
        onChange={(event) => onSelectionChange(event.target.checked)}
      />
      <ItemImage url={item.thumbnailImageUrl} />
      <div className={styles.info}>
        <h3>{item.title}</h3>
        <div className={styles.meta}>
          <QuantityControl
            value={quantity}
            maximum={item.quantity}
            disabled={disabled || unavailable}
            onChange={onQuantityChange}
          />
          <span>보유 수량: {item.quantity}</span>
          {unavailable && <span className={styles.badge}>교환 불가</span>}
        </div>
      </div>
    </div>
  )
}
