import type { ItemListItem } from '@/types/item'
import styles from './ItemCard.module.css'

type ItemCardProps = {
  item: ItemListItem
}

function formatRelativeTime(createdAt: string) {
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMilliseconds / 60_000))

  if (elapsedMinutes < 1) return '방금 전'
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}시간 전`

  return `${Math.floor(elapsedHours / 24)}일 전`
}

export default function ItemCard({ item }: ItemCardProps) {
  const isAvailable = item.itemState === 'AVAILABLE'

  return (
    <article className={styles.card}>
      <div className={styles.thumbnail}>
        <svg viewBox="0 0 24 24">
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <circle cx="9" cy="9.5" r="1.5" />
          <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
        </svg>
      </div>
      <div className={styles.content}>
        <h2 className={styles.title}>{item.title}</h2>
        <p className={styles.meta}>
          <span>수량: {item.quantity}개</span>
          <span>등록자: {item.owner.nickname}</span>
          <span className={styles.time}>
            {formatRelativeTime(item.createdAt)}
          </span>
        </p>
        <p className={styles.preview}>{item.contentPreview}</p>
        <span
          className={`${styles.status} ${
            isAvailable ? styles.available : styles.completed
          }`}
        >
          {isAvailable ? '거래 가능' : '거래 완료'}
        </span>
      </div>
    </article>
  )
}
