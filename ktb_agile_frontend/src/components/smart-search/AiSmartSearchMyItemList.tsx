'use client'

import { useCallback, useState } from 'react'
import { useMyGroupItems } from '@/hooks/useMyGroupItems'
import type { MyItemListItem } from '@/types/item'
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
  const [draftQuantities, setDraftQuantities] = useState<
    Record<number, number>
  >({})
  const rememberTitles = useCallback(
    (items: MyItemListItem[]) =>
      setItemTitles((current) => ({
        ...current,
        ...Object.fromEntries(items.map((item) => [item.itemId, item.title])),
      })),
    [setItemTitles],
  )
  const {
    filteredItems: groupItems,
    visibleItems,
    pageIndex,
    hasNext,
    isLoading,
    errorMessage,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    retry,
  } = useMyGroupItems({
    groupId,
    availableOnly: true,
    onPageLoaded: rememberTitles,
  })

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
