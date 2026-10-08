'use client'

import { useState } from 'react'
import type { ExchangedItem, ExchangeHistory } from '@/types/exchangedItem'
import styles from './ExchangeHistoryCard.module.css'

function ItemThumbnail({ item }: { item: ExchangedItem }) {
  return (
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
  )
}

function formatExchangeDate(value: string) {
  const date = value.slice(0, 10).replaceAll('-', '.')
  return date || value
}

export default function ExchangeHistoryCard({
  exchange,
  currentUserId,
}: {
  exchange: ExchangeHistory
  currentUserId: number
}) {
  const [expandedSide, setExpandedSide] = useState<'mine' | 'partner' | null>(
    null,
  )
  const exchangedItems = [exchange.requestedItem, ...exchange.offeredItems]
  const myItems = exchangedItems.filter(
    (item) => item.owner.userId === currentUserId,
  )
  const partnerItems = exchangedItems.filter(
    (item) => item.owner.userId !== currentUserId,
  )
  const [myRepresentative, ...otherMyItems] = myItems
  const [partnerRepresentative, ...otherPartnerItems] = partnerItems
  const myItemsTitle = myRepresentative
    ? `${myRepresentative.title}${otherMyItems.length ? ` 외 ${otherMyItems.length}개` : ''}`
    : '내 물품 정보 없음'
  const statusLabel =
    exchange.exchangeStatus === 'COMPLETED'
      ? '교환 완료'
      : exchange.exchangeStatus

  return (
    <article className={styles.card}>
      <h2 className={styles.cardTitle}>{myItemsTitle}</h2>
      <div className={styles.exchangePair}>
        <div className={styles.itemSide}>
          <span className={styles.sideLabel}>내 물품</span>
          {myRepresentative ? (
            <>
              <ItemThumbnail item={myRepresentative} />
              <strong className={styles.itemTitle}>
                {myRepresentative.title}
              </strong>
              <span className={styles.itemMeta}>
                {myRepresentative.owner.nickname} · {myRepresentative.quantity}
                개
              </span>
            </>
          ) : (
            <span className={styles.itemTitle}>물품 정보 없음</span>
          )}
        </div>
        <span className={styles.exchangeArrow}>⇄</span>
        <div className={styles.itemSide}>
          <span className={styles.sideLabel}>상대 물품</span>
          {partnerRepresentative ? (
            <>
              <ItemThumbnail item={partnerRepresentative} />
              <strong className={styles.itemTitle}>
                {partnerRepresentative.title}
              </strong>
              <span className={styles.itemMeta}>
                {partnerRepresentative.owner.nickname} ·{' '}
                {partnerRepresentative.quantity}개
              </span>
            </>
          ) : (
            <span className={styles.itemTitle}>물품 정보 없음</span>
          )}
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.status}>{statusLabel}</span>
        <span className={styles.date}>
          {formatExchangeDate(exchange.exchangedAt)}
        </span>
      </div>
      {[
        { side: 'mine' as const, label: '내 물품', items: otherMyItems },
        {
          side: 'partner' as const,
          label: '상대 물품',
          items: otherPartnerItems,
        },
      ].map(({ side, label, items }) =>
        items.length > 0 ? (
          <div className={styles.details} key={side}>
            <button
              className={styles.detailsButton}
              type="button"
              onClick={() =>
                setExpandedSide((current) => (current === side ? null : side))
              }
            >
              함께 교환한 {label} {items.length}개
              <span
                className={
                  expandedSide === side ? styles.chevronOpen : styles.chevron
                }
              >
                ⌄
              </span>
            </button>
            {expandedSide === side && (
              <ul className={styles.detailsList}>
                {items.map((item) => (
                  <li className={styles.detailItem} key={item.itemId}>
                    <ItemThumbnail item={item} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.owner.nickname} · {item.quantity}개
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null,
      )}
    </article>
  )
}
