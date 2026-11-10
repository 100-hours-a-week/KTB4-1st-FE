'use client'

import { EXCHANGE_ERRORS } from '@/constants/errors/exchange'
import { useMyGroupItems } from '@/hooks/useMyGroupItems'
import type { OfferableItem } from '@/types/item'
import OfferingItemCard from './OfferingItemCard'
import styles from './ExchangeForm.module.css'

type ExchangeMyItemListProps = {
  groupId: number
  selectedIds: number[]
  quantities: Record<number, number>
  disabled: boolean
  requestPage: boolean
  onSelectionChange: (item: OfferableItem, selected: boolean) => void
  onQuantityChange: (itemId: number, quantity: number) => void
}

/** 선택한 그룹에 등록한 내 물품을 교환 가능한 물품부터 보여줍니다.
 * 그룹이 바뀌면 key={groupId}로 다시 마운트해 목록과 페이지를 초기화합니다.
 */
export default function ExchangeMyItemList({
  groupId,
  selectedIds,
  quantities,
  disabled,
  requestPage,
  onSelectionChange,
  onQuantityChange,
}: ExchangeMyItemListProps) {
  const {
    filteredItems: groupItems,
    visibleItems,
    pageIndex,
    pageCount,
    isLoading,
    errorMessage,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    retry,
  } = useMyGroupItems({
    groupId,
    errorMessage: EXCHANGE_ERRORS.MY_ITEMS_LOAD_FAILED,
  })

  if (isLoading) {
    return <p className={styles.message}>내 물품을 불러오는 중입니다.</p>
  }

  if (errorMessage) {
    return (
      <div className={styles.pageError}>
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
        <button type="button" disabled={disabled} onClick={retry}>
          다시 불러오기
        </button>
      </div>
    )
  }

  if (groupItems.length === 0) {
    return (
      <p className={styles.message}>이 그룹에 등록한 내 물품이 없습니다.</p>
    )
  }

  return (
    <>
      <div className={styles.list}>
        {visibleItems.map((owned) => (
          <OfferingItemCard
            key={owned.itemId}
            item={owned}
            selected={selectedIds.includes(owned.itemId)}
            quantity={quantities[owned.itemId] ?? 1}
            disabled={disabled}
            requestPage={requestPage}
            onSelectionChange={(selected) => onSelectionChange(owned, selected)}
            onQuantityChange={(value) => onQuantityChange(owned.itemId, value)}
          />
        ))}
      </div>
      <nav className={styles.pagination} aria-label="내 물품 페이지">
        <button
          type="button"
          disabled={!canGoPrevious || disabled}
          onClick={goToPreviousPage}
        >
          이전
        </button>
        <span aria-live="polite">
          {pageIndex + 1} / {pageCount}
        </span>
        <button
          type="button"
          disabled={!canGoNext || disabled}
          onClick={goToNextPage}
        >
          다음
        </button>
      </nav>
    </>
  )
}
