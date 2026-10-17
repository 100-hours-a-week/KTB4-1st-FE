'use client'

import axios from 'axios'
import { useEffect, useState } from 'react'
import '@/config/api'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import AiSmartSearchMyItem from './AiSmartSearchMyItem'
import { useSmartSearch } from './SmartSearchProvider'
import styles from './AiSmartSearchMyItemList.module.css'

export default function AiSmartSearchMyItemList({
  groupId,
}: {
  groupId: number
}) {
  const { items: selectedItems, setItems: setSelectedItems } = useSmartSearch()
  const [items, setItems] = useState<MyItemListItem[]>([])
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, number>
  >({})
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const groupItems = items.filter(
    (item) =>
      item.itemState === 'AVAILABLE' &&
      item.groups.some((group) => group.groupId === groupId),
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadMyItems() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await axios.get<MyItemListResponse>('/bff/my-items', {
          params: { groupId, ...(cursor ? { cursor } : {}) },
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
  }, [groupId, cursor, retryCount])

  function getQuantity(item: MyItemListItem) {
    const selected = selectedItems.find(({ itemId }) => itemId === item.itemId)
    return selected?.quantity ?? draftQuantities[item.itemId] ?? 1
  }

  function toggleItem(item: MyItemListItem) {
    setSelectedItems(
      selectedItems.some(({ itemId }) => itemId === item.itemId)
        ? selectedItems.filter(({ itemId }) => itemId !== item.itemId)
        : [
            ...selectedItems,
            {
              itemId: item.itemId,
              quantity: Math.min(getQuantity(item), item.quantity),
            },
          ],
    )
  }

  function changeQuantity(item: MyItemListItem, quantity: number) {
    const nextQuantity = Math.max(1, Math.min(quantity, item.quantity))
    setDraftQuantities((current) => ({
      ...current,
      [item.itemId]: nextQuantity,
    }))
    setSelectedItems(
      selectedItems.map((selected) =>
        selected.itemId === item.itemId
          ? { ...selected, quantity: nextQuantity }
          : selected,
      ),
    )
  }

  return (
    <section className={styles.itemsSection}>
      <h2>내 물건 목록</h2>
      {groupItems.length > 0 && (
        <ul className={styles.itemList}>
          {groupItems.map((item) => (
            <li key={item.itemId}>
              <AiSmartSearchMyItem
                item={item}
                checked={selectedItems.some(
                  ({ itemId }) => itemId === item.itemId,
                )}
                quantity={getQuantity(item)}
                onToggle={() => toggleItem(item)}
                onQuantityChange={(quantity) => changeQuantity(item, quantity)}
              />
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
    </section>
  )
}
