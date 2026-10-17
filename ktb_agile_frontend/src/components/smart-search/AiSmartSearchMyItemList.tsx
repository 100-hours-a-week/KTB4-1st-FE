'use client'

import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
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
  const {
    items: selectedItems,
    setItems: setSelectedItems,
    setItemTitles,
  } = useSmartSearch()
  const [items, setItems] = useState<MyItemListItem[]>([])
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, number>
  >({})
  const [pageIndex, setPageIndex] = useState(0)
  const cache = useRef({
    items: [] as MyItemListItem[],
    nextCursor: null as string | null,
    hasNext: true,
    initialized: false,
    seenCursors: new Set<string>(),
  })
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
        const requiredCount = (pageIndex + 1) * 5
        const selectableCount = () =>
          cache.current.items.filter(
            (item) =>
              item.itemState === 'AVAILABLE' &&
              item.groups.some((group) => group.groupId === groupId),
          ).length

        // 마지막으로 확보한 5개를 보는 동안 다음 묶음을 미리 확보합니다.
        while (
          !cache.current.initialized ||
          (cache.current.hasNext && selectableCount() <= requiredCount)
        ) {
          const pageCursor = cache.current.nextCursor
          const response = await axios.get<MyItemListResponse>(
            '/bff/my-items',
            {
              params: {
                groupId,
                ...(pageCursor ? { cursor: pageCursor } : {}),
              },
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            },
          )
          if (controller.signal.aborted) return
          const page = response.data.data
          if (!page || response.data.error) {
            throw new Error(
              response.data.error?.message || '내 물품을 불러오지 못했습니다.',
            )
          }
          if (
            page.hasNext &&
            (!page.nextCursor || cache.current.seenCursors.has(page.nextCursor))
          ) {
            throw new Error('내 물품을 불러오지 못했습니다.')
          }
          if (page.nextCursor) cache.current.seenCursors.add(page.nextCursor)
          const loaded = cache.current.items
          cache.current = {
            ...cache.current,
            items: [
              ...loaded,
              ...page.items.filter(
                (item) =>
                  !loaded.some((existing) => existing.itemId === item.itemId),
              ),
            ],
            nextCursor: page.nextCursor,
            hasNext: page.hasNext,
            initialized: true,
          }
          setItems(cache.current.items)
          setHasNext(page.hasNext)
          setItemTitles((current) => ({
            ...current,
            ...Object.fromEntries(
              page.items.map((item) => [item.itemId, item.title]),
            ),
          }))
        }
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
  }, [groupId, pageIndex, retryCount, setItemTitles])

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
          {groupItems.slice(pageIndex * 5, (pageIndex + 1) * 5).map((item) => (
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
        <p className={styles.message}>교환 대상으로 선택할 물품이 없습니다</p>
      )}
      {groupItems.length > 0 && (
        <nav className={styles.pagination} aria-label="내 물품 페이지">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((current) => current - 1)}
          >
            이전
          </button>
          <span aria-live="polite">{pageIndex + 1}페이지</span>
          <button
            type="button"
            disabled={groupItems.length <= (pageIndex + 1) * 5}
            onClick={() => setPageIndex((current) => current + 1)}
          >
            다음
          </button>
        </nav>
      )}
    </section>
  )
}
