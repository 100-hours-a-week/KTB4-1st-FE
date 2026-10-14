'use client'

import axios from 'axios'
import { useEffect, useState } from 'react'
import '@/config/api'
import QuantityControl from '@/components/common/exchange/QuantityControl'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import styles from './SmartSearchMyItems.module.css'

type SmartSearchMyItemsProps = {
  groupId: number
  onSelectionChange: (items: SelectedSmartSearchItem[]) => void
}

export type SelectedSmartSearchItem = {
  item: MyItemListItem
  quantity: number
}

export default function SmartSearchMyItems({
  groupId,
  onSelectionChange,
}: SmartSearchMyItemsProps) {
  const [items, setItems] = useState<MyItemListItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const groupItems = items.filter((item) =>
    item.groups.some((group) => group.groupId === groupId && item.itemState === 'AVAILABLE'),
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadMyItems() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await axios.get<MyItemListResponse>('/bff/my-items', {
          params: cursor ? { cursor } : undefined,
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        if (controller.signal.aborted) return

        const page = response.data.data
        if (!page || response.data.error) {
          throw new Error(
            response.data.error?.message || '내 물품을 불러오지 못했습니다.',
          )
        }

        setItems((current) =>
          cursor
            ? [
                ...current,
                ...page.items.filter(
                  (item) =>
                    !current.some((loaded) => loaded.itemId === item.itemId),
                ),
              ]
            : page.items,
        )
        setNextCursor(page.nextCursor)
        setHasNext(page.hasNext)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(
          axios.isAxiosError<MyItemListResponse>(error)
            ? error.response?.data.error?.message ||
                '내 물품을 불러오지 못했습니다.'
            : error instanceof Error
              ? error.message
              : '내 물품을 불러오지 못했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadMyItems()
    return () => controller.abort()
  }, [cursor, retryCount])

  function toggleItem(itemId: number) {
    const nextIds = selectedItemIds.includes(itemId)
      ? selectedItemIds.filter((id) => id !== itemId)
      : [...selectedItemIds, itemId]
    setSelectedItemIds(nextIds)
    onSelectionChange(
      groupItems
        .filter((item) => nextIds.includes(item.itemId))
        .map((item) => ({
          item,
          quantity: Math.min(quantities[item.itemId] ?? 1, item.quantity),
        })),
    )
  }

  function changeQuantity(item: MyItemListItem, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(quantity, item.quantity))
    setQuantities((current) => ({
      ...current,
      [item.itemId]: nextQuantity,
    }))
    if (selectedItemIds.includes(item.itemId)) {
      onSelectionChange(
        groupItems
          .filter((selectedItem) =>
            selectedItemIds.includes(selectedItem.itemId),
          )
          .map((selectedItem) => ({
            item: selectedItem,
            quantity:
              selectedItem.itemId === item.itemId
                ? nextQuantity
                : Math.min(
                    quantities[selectedItem.itemId] ?? 1,
                    selectedItem.quantity,
                  ),
          })),
      )
    }
  }

  return (
    <>
      {groupItems.length > 0 && (
        <ul className={styles.itemList}>
          {groupItems.map((item) => (
            <li key={item.itemId}>
              <div className={styles.itemCard}>
                <label className={styles.itemSelection}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.itemId)}
                    disabled={
                      item.itemState !== 'AVAILABLE' || item.quantity < 1
                    }
                    onChange={() => toggleItem(item.itemId)}
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
                      {item.groups
                        .map((group) => group.groupName)
                        .join(' · ') || '그룹 정보 없음'}
                    </span>
                    <strong>{item.title}</strong>
                    <span className={styles.preview}>
                      {item.contentPreview}
                    </span>
                    <small>
                      보유 수량 {item.quantity}개 · 관심 {item.likeCount} · 교환
                      요청 {item.exchangeRequestCount}
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
                    value={Math.min(
                      quantities[item.itemId] ?? 1,
                      Math.max(1, item.quantity),
                    )}
                    maximum={item.quantity}
                    disabled={
                      item.itemState !== 'AVAILABLE' || item.quantity < 1
                    }
                    onChange={(quantity) => changeQuantity(item, quantity)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isLoading && (
        <p className={styles.message}>내 물품을 불러오는 중입니다.</p>
      )}
      {!isLoading && errorMessage && (
        <div className={styles.message}>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            다시 시도
          </button>
        </div>
      )}
      {!isLoading && !errorMessage && groupItems.length === 0 && !hasNext && (
        <p className={styles.message}>선택한 그룹에 등록한 물품이 없습니다.</p>
      )}
      {!isLoading && !errorMessage && hasNext && nextCursor && (
        <button
          type="button"
          className={styles.moreButton}
          onClick={() => setCursor(nextCursor)}
        >
          더 보기
        </button>
      )}
    </>
  )
}
