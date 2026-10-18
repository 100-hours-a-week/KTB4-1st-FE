'use client'

import axios from 'axios'
import { useCallback, useState } from 'react'
import '@/config/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import AiSmartSearchMyItem from './AiSmartSearchMyItem'
import { useSmartSearch } from './SmartSearchProvider'
import styles from './AiSmartSearchMyItemList.module.css'

const getItemKey = (item: MyItemListItem) => item.itemId

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
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, number>
  >({})
  const fetchMyItems = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      const response = await axios.get<MyItemListResponse>('/bff/my-items', {
        params: { groupId, ...(cursor ? { cursor } : {}) },
        headers: { Accept: 'application/json' },
        signal,
      })
      const page = response.data.data
      if (!page || response.data.error) {
        throw new Error(
          response.data.error?.message || '내 물품을 불러오지 못했습니다.',
        )
      }
      if (!signal.aborted) {
        setItemTitles((current) => ({
          ...current,
          ...Object.fromEntries(
            page.items.map((item) => [item.itemId, item.title]),
          ),
        }))
      }
      return page
    },
    [groupId, setItemTitles],
  )
  const isSelectable = useCallback(
    (item: MyItemListItem) =>
      item.itemState === 'AVAILABLE' &&
      item.groups.some((group) => group.groupId === groupId),
    [groupId],
  )
  const {
    filteredItems: groupItems,
    visibleItems,
    pageIndex,
    hasNext,
    isLoading,
    error,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    retry,
  } = useCursorPagination({
    fetchPage: fetchMyItems,
    getKey: getItemKey,
    filter: isSelectable,
    cursorErrorMessage: '내 물품을 불러오지 못했습니다.',
  })
  const errorMessage = error
    ? axios.isAxiosError<MyItemListResponse>(error)
      ? error.response?.data.error?.message || '내 물품을 불러오지 못했습니다.'
      : error instanceof Error
        ? error.message
        : '내 물품을 불러오지 못했습니다.'
    : null

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
          {visibleItems.map((item) => (
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
          <button type="button" onClick={retry}>
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
            disabled={!canGoPrevious}
            onClick={goToPreviousPage}
          >
            이전
          </button>
          <span aria-live="polite">{pageIndex + 1}페이지</span>
          <button type="button" disabled={!canGoNext} onClick={goToNextPage}>
            다음
          </button>
        </nav>
      )}
    </section>
  )
}
