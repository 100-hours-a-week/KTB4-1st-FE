import { memo } from 'react'
import type { ItemListItem } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import { formatLastTime } from '@/utils/date'
import styles from './ItemCard.module.css'
import Link from 'next/link'
import LikeButton from '@/components/item/like/LikeButton'

type ItemCardProps = {
  item: ItemListItem
}

function ItemCard({ item }: ItemCardProps) {
  const isAvailable = item.itemState === 'AVAILABLE'

  return (
    <article className={styles.card}>
      <Link className={styles.link} href={`/pages/items/${item.itemId}`}>
        <div className={styles.thumbnail}>
          {item.thumbnailImageUrl && (
            // 서버 이미지 URL의 허용 도메인이 고정되지 않아 일반 img를 사용합니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.thumbnailImage}
              src={item.thumbnailImageUrl}
              alt=""
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

// 다음 페이지가 추가되어도 같은 물품 객체를 받는 기존 카드는 재계산하지 않습니다.
export default memo(ItemCard)
