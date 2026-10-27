import type { ItemListItem } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import { formatLastTime } from '@/utils/date'
import styles from './ItemCard.module.css'
import Link from 'next/link'
import LikeButton from '@/components/item/like/LikeButton'

type ItemCardProps = {
  item: ItemListItem
}

export default function ItemCard({ item }: ItemCardProps) {
  const isAvailable = item.itemState === 'AVAILABLE'

  return (
    <article className={styles.card}>
      <Link className={styles.link} href={`/pages/items/${item.itemId}`}>
        <div className={styles.thumbnail}>
          {item.thumbnailImageUrl && (
            // 서버 이미지 URL은 Next Image의 허용 도메인이 고정되지 않아 브라우저의 지연 로딩을 사용합니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.thumbnailImage}
              src={item.thumbnailImageUrl}
              alt=""
              loading="lazy"
            />
          )}
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{item.title}</h2>
          <p className={styles.preview}>{item.contentPreview}</p>
          <p className={styles.meta}>
            <span>등록자: {item.owner.nickname}</span>
            <span>수량: {item.quantity}개</span>
            <span>조회 수 : {item.viewCount}</span>
            <span>교환 요청 수 : {item.exchangeRequestCount}</span>
          </p>
          <div className={styles.footer}>
            <p className={styles.time}>{formatLastTime(item.createdAt)}</p>
            <span
              className={`${styles.status} ${
                isAvailable ? styles.available : styles.completed
              }`}
            >
              {getItemStateLabel(item.itemState)}
            </span>
          </div>
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
