import Link from 'next/link'
import type { MyItemListItem } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import styles from './ActivityItemCard.module.css'

type ActivityItemCardProps = {
  item: MyItemListItem
  groupId?: number
}

export default function ActivityItemCard({
  item,
  groupId,
}: ActivityItemCardProps) {
  const isAvailable = item.itemState === 'AVAILABLE'
  const href = `/pages/items/${item.itemId}${groupId ? `?groupId=${groupId}` : ''}`

  return (
    <Link className={styles.card} href={href}>
      <div
        className={styles.thumbnail}
        style={
          item.thumbnailImageUrl
            ? {
                backgroundImage: `url("${item.thumbnailImageUrl.replaceAll('"', '%22')}")`,
              }
            : undefined
        }
      >
        {!item.thumbnailImageUrl && (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
            <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
          </svg>
        )}
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardHeading}>
          <span className={styles.groupName}>
            {item.groups.map((group) => group.groupName).join(' · ') ||
              '그룹 정보 없음'}
          </span>
          <span
            className={`${styles.status} ${isAvailable ? styles.available : styles.unavailable}`}
          >
            {getItemStateLabel(item.itemState)}
          </span>
        </div>
        <h2 className={styles.cardTitle}>{item.title}</h2>
        <p className={styles.preview}>{item.contentPreview}</p>
        <div className={styles.meta}>
          <span>수량 {item.quantity}개</span>
          <span>관심 {item.likeCount}</span>
          <span>교환 요청 {item.exchangeRequestCount}</span>
        </div>
      </div>
    </Link>
  )
}
