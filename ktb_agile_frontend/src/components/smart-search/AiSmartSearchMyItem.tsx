'use client'

import QuantityControl from '@/components/common/exchange/QuantityControl'
import type { MyItemListItem } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import styles from './AiSmartSearchMyItem.module.css'

type AiSmartSearchMyItemProps = {
  item: MyItemListItem
  checked: boolean
  quantity: number
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
}

export default function AiSmartSearchMyItem({
  item,
  checked,
  quantity,
  onToggle,
  onQuantityChange,
}: AiSmartSearchMyItemProps) {
  const isDisabled = item.itemState !== 'AVAILABLE' || item.quantity < 1

  return (
    <div className={styles.itemCard}>
      <label className={styles.itemSelection}>
        <input
          type="checkbox"
          checked={checked}
          disabled={isDisabled}
          onChange={onToggle}
        />
        <span
          className={styles.thumbnail}
          style={
            item.thumbnailImageUrl
              ? {
                  backgroundImage: `url("${item.thumbnailImageUrl.replaceAll('"', '%22')}")`,
                }
              : undefined
          }
        />
        <span className={styles.itemInfo}>
          <span className={styles.groupName}>
            {item.groups.map((group) => group.groupName).join(' · ') ||
              '그룹 정보 없음'}
          </span>
          <strong>{item.title}</strong>
          <span className={styles.preview}>{item.contentPreview}</span>
          <small>
            보유 수량 {item.quantity}개 · 관심 {item.likeCount} · 교환 요청{' '}
            {item.exchangeRequestCount}
          </small>
        </span>
        <span className={styles.itemStatus}>
          {getItemStateLabel(item.itemState)}
        </span>
      </label>
      <div
        className={styles.quantityRow}
        role="group"
        aria-label={`${item.title} 요청 수량`}
      >
        <span>요청 수량</span>
        <QuantityControl
          value={Math.min(quantity, Math.max(1, item.quantity))}
          maximum={item.quantity}
          disabled={isDisabled}
          onChange={onQuantityChange}
        />
      </div>
    </div>
  )
}
