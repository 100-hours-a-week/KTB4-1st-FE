import type { ItemListItem } from '@/types/item'
import { formatRelativeTime, getItemStateLabel } from '@/utils/item'
import styles from './ItemCard.module.css'
import Link from 'next/link'
import LikeButton from './like/LikeButton'

type ItemCardProps = {
  item: ItemListItem
}

export default function ItemCard({ item }: ItemCardProps) {
  const isAvailable = item.itemState === 'AVAILABLE'

  return (
    <article className={styles.card}>
      <Link className={styles.link} href={`/pages/items/${item.itemId}`}>
        <div
          className={styles.thumbnail}
          style={
            item.thumbnailImageUrl
              ? {
                  backgroundImage: `url("${item.thumbnailImageUrl.replaceAll('"', '%22')}")`,
                }
              : undefined
          }
        />
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
            {getItemStateLabel(item.itemState)}
          </span>
        </div>
      </Link>
      <LikeButton
        itemId={item.itemId}
        isLiked={item.isLiked}
        initialLikeCount={item.likeCount}
      />
    </article>
  )
}
