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
}: {
  exchange: ExchangeHistory
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [representativeItem, ...otherItems] = exchange.offeredItems
  const offeredTitle = representativeItem
    ? `${representativeItem.title}${otherItems.length ? ` 외 ${otherItems.length}개` : ''}`
    : '내 물품 정보 없음'
  const statusLabel =
    exchange.exchangeStatus === 'COMPLETED'
      ? '교환 완료'
      : exchange.exchangeStatus

  return (
    <article className={styles.card}>
      <h2 className={styles.cardTitle}>{offeredTitle}</h2>
      <div className={styles.exchangePair}>
        <div className={styles.itemSide}>
          <span className={styles.sideLabel}>내 물품</span>
          {representativeItem ? (
            <>
              <ItemThumbnail item={representativeItem} />
              <strong className={styles.itemTitle}>
                {representativeItem.title}
              </strong>
              <span className={styles.itemMeta}>
                {representativeItem.owner.nickname} ·{' '}
                {representativeItem.quantity}개
              </span>
            </>
          ) : (
            <span className={styles.itemTitle}>물품 정보 없음</span>
          )}
        </div>
        <span className={styles.exchangeArrow}>⇄</span>
        <div className={styles.itemSide}>
          <span className={styles.sideLabel}>상대 물품</span>
          <ItemThumbnail item={exchange.requestedItem} />
          <strong className={styles.itemTitle}>
            {exchange.requestedItem.title}
          </strong>
          <span className={styles.itemMeta}>
            {exchange.requestedItem.owner.nickname} ·{' '}
            {exchange.requestedItem.quantity}개
          </span>
        </div>
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.status}>{statusLabel}</span>
        <span className={styles.date}>
          {formatExchangeDate(exchange.exchangedAt)}
        </span>
      </div>
      {otherItems.length > 0 && (
        <div className={styles.details}>
          <button
            className={styles.detailsButton}
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            함께 교환한 내 물품 {otherItems.length}개
            <span className={isExpanded ? styles.chevronOpen : styles.chevron}>
              ⌄
            </span>
          </button>
          {isExpanded && (
            <ul className={styles.detailsList}>
              {otherItems.map((item) => (
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
      )}
    </article>
  )
}
