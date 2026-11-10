'use client'

import type { OfferableItem } from '@/types/item'
import { isItemAvailable } from '@/utils/item'
import ItemImage from './ItemImage'
import QuantityControl from '../common/exchange/QuantityControl'
import styles from './ExchangeForm.module.css'

type OfferingItemCardProps = {
  item: OfferableItem
  selected: boolean
  quantity: number
  disabled?: boolean
  requestPage?: boolean
  onSelectionChange: (selected: boolean) => void
  onQuantityChange: (quantity: number) => void
}

export default function OfferingItemCard({
  item,
  selected,
  quantity,
  disabled = false,
  requestPage = false,
  onSelectionChange,
  onQuantityChange,
}: OfferingItemCardProps) {
  const unavailable = !isItemAvailable(item)

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
            variant={requestPage ? 'requestOffer' : undefined}
            onChange={onQuantityChange}
          />
          <span>보유 수량: {item.quantity}</span>
          {unavailable && <span className={styles.badge}>교환 불가</span>}
        </div>
      </div>
    </div>
  )
}
