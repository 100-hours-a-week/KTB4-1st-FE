'use client'

import { EXCHANGE_ERRORS } from '@/constants/errors/exchange'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { API_BASE_URL } from '@/config/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { ItemDetail, ItemDetailResponse, ItemListItem } from '@/types/item'
import { getUserIdFromAccessToken, redirectToLogin } from '@/utils/auth'
import { getItemStateLabel } from '@/utils/item'
import OfferingItemCard from './OfferingItemCard'
import QuantityControl from '../common/exchange/QuantityControl'
import ItemImage from './ItemImage'
import styles from './ExchangeForm.module.css'

const FETCH_SIZE = 10

type MyItemsResponse = {
  data: {
    items: Omit<ItemListItem, 'owner'>[]
    nextCursor: string | null
    hasNext: boolean
  }
  error: null
}

const getItemKey = (item: Omit<ItemListItem, 'owner'>) => item.itemId

function getErrorMessage(cause: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: { message?: string } }>(cause)) {
    return cause.response?.data?.error?.message || fallback
  }
  return cause instanceof Error ? cause.message : fallback
}

export type ExchangeFormValues = {
  groupId?: number
  requestedQuantity: number
  offeredItems: { itemId: number; quantity: number }[]
}

type ExchangeFormProps = {
  itemId: number
  includeGroupId?: boolean
  submitLabel: string
  onSubmit: (values: ExchangeFormValues, accessToken: string) => Promise<void>
  initialValues?: ExchangeFormValues
  closeHref?: string
}

export default function ExchangeForm(props: ExchangeFormProps) {
  return <ExchangeFormContent key={props.itemId} {...props} />
}

function ExchangeFormContent({
  itemId,
  includeGroupId = false,
  submitLabel,
  onSubmit,
  initialValues,
  closeHref,
}: ExchangeFormProps) {
  const router = useRouter()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [initialSelectedItems, setInitialSelectedItems] = useState<
    Omit<ItemListItem, 'owner'>[]
  >([])
  const initialOfferedIds = useRef(
    initialValues?.offeredItems.map((offered) => offered.itemId) ?? [],
  )
  const [requestedQuantity, setRequestedQuantity] = useState(
    initialValues?.requestedQuantity ?? 1,
  )
  const [groupId, setGroupId] = useState<number | null>(null)
  const [offeredQuantities, setOfferedQuantities] = useState<
    Record<number, number>
  >(() =>
    Object.fromEntries(
      initialValues?.offeredItems.map((offered) => [
        offered.itemId,
        offered.quantity,
      ]) ?? [],
    ),
  )
  const [selectedIds, setSelectedIds] = useState<number[]>(
    () => initialValues?.offeredItems.map((offered) => offered.itemId) ?? [],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMyItems = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      const accessToken = sessionStorage.getItem('accessToken')
      const userId = accessToken ? getUserIdFromAccessToken(accessToken) : null
      if (!userId) {
        redirectToLogin(router)
        throw new Error('로그인이 필요합니다.')
      }
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      }
      try {
        let target: ItemDetail | null = null
        if (cursor === null) {
          if (!Number.isSafeInteger(itemId) || itemId <= 0) {
            throw new Error(EXCHANGE_ERRORS.ITEM_ID_INVALID)
          }
          const response = await axios.get<ItemDetailResponse>(
            `${API_BASE_URL}/items/${itemId}`,
            { headers, signal },
          )
          target = response.data.data
          if (target.owner.userId === userId) {
            throw new Error(EXCHANGE_ERRORS.OWN_ITEM_NOT_ALLOWED)
          }
        }
        const response = await axios.get<MyItemsResponse>(
          `${API_BASE_URL}/users/me/items`,
          {
            params: { size: FETCH_SIZE, ...(cursor ? { cursor } : {}) },
            headers,
            signal,
          },
        )
        const page = response.data.data
        if (target) {
          // 수정할 기존 제안은 첫 조회에 포함되지 않은 물품도 복원합니다.
          const missingSelected = await Promise.all(
            initialOfferedIds.current
              .filter((id) => !page.items.some((owned) => owned.itemId === id))
              .map(async (id) => {
                const response = await axios.get<ItemDetailResponse>(
                  `${API_BASE_URL}/items/${id}`,
                  { headers, signal },
                )
                const detail = response.data.data
                return {
                  ...detail,
                  contentPreview: detail.content,
                  thumbnailImageUrl:
                    detail.images.toSorted(
                      (a, b) => a.displayOrder - b.displayOrder,
                    )[0]?.imageUrl ?? null,
                }
              }),
          )
          if (!signal.aborted) {
            setItem(target)
            setGroupId(
              target.groups.length === 1 ? target.groups[0].groupId : null,
            )
            setInitialSelectedItems(missingSelected)
          }
        }
        return page
      } catch (cause) {
        throw new Error(
          getErrorMessage(
            cause,
            cursor
              ? EXCHANGE_ERRORS.MY_ITEMS_NEXT_PAGE_FAILED
              : EXCHANGE_ERRORS.ITEM_LOOKUP_FAILED,
          ),
        )
      }
    },
    [itemId, router],
  )

  const {
    items: myItems,
    visibleItems,
    pageIndex,
    pageCount,
    isInitialLoading: isLoading,
    isLoading: isFetchingItems,
    error: paginationError,
    canGoPrevious,
    canGoNext,
    goToPreviousPage,
    goToNextPage,
    retry,
  } = useCursorPagination({
    fetchPage: fetchMyItems,
    getKey: getItemKey,
    cursorErrorMessage: EXCHANGE_ERRORS.MY_ITEMS_NEXT_PAGE_FAILED,
  })
  const currentPage = pageIndex + 1
  const isFetchingMore = isFetchingItems && !isLoading
  const pageError = paginationError
    ? getErrorMessage(
        paginationError,
        EXCHANGE_ERRORS.MY_ITEMS_NEXT_PAGE_FAILED,
      )
    : null

  const ownedItems = [
    ...myItems,
    ...initialSelectedItems.filter(
      (entry) => !myItems.some((loaded) => loaded.itemId === entry.itemId),
    ),
  ]
  const selectedItems = selectedIds.flatMap((id) => {
    const owned = ownedItems.find((entry) => entry.itemId === id)
    return owned ? [owned] : []
  })
  const offeredItems = selectedItems.map((entry) => ({
    itemId: entry.itemId,
    quantity: offeredQuantities[entry.itemId] ?? 1,
  }))
  const canRequest =
    !!item &&
    item.itemState === 'AVAILABLE' &&
    item.quantity >= 1 &&
    offeredItems.length > 0 &&
    (!includeGroupId || groupId !== null)

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canRequest || !item || submitting.current) return
    const accessToken = sessionStorage.getItem('accessToken')
    if (!accessToken || !getUserIdFromAccessToken(accessToken)) {
      redirectToLogin(router)
      return
    }
    const validQuantity = (quantity: number, stock: number) =>
      Number.isInteger(quantity) && quantity >= 1 && quantity <= stock
    if (
      !validQuantity(requestedQuantity, item.quantity) ||
      offeredItems.some((offered) => {
        const owned = ownedItems.find(
          (entry) => entry.itemId === offered.itemId,
        )
        return (
          !owned ||
          owned.itemState !== 'AVAILABLE' ||
          !validQuantity(offered.quantity, owned.quantity)
        )
      })
    ) {
      setError(EXCHANGE_ERRORS.QUANTITY_INVALID)
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(
        {
          ...(includeGroupId ? { groupId: groupId! } : {}),
          requestedQuantity,
          offeredItems,
        },
        accessToken,
      )
    } catch (cause) {
      setError(getErrorMessage(cause, EXCHANGE_ERRORS.PROCESS_FAILED))
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`${styles.page} ${closeHref ? '' : styles.requestPage}`}>
      <header className={styles.header}>
        {closeHref ? (
          <>
            <h1>교환 요청 수정</h1>
            <Link className={styles.close} href={closeHref}>
              ×
            </Link>
          </>
        ) : (
          <>
            <button
              className={`${styles.close} ${styles.closeButton}`}
              type="button"
              aria-label="뒤로가기"
              onClick={() => router.back()}
            >
              &lt;
            </button>
            <h1>교환 요청</h1>
          </>
        )}
      </header>
      <div className={closeHref ? undefined : styles.body}>
        {isLoading ? (
          <p className={styles.message}>물품 정보를 불러오는 중입니다.</p>
        ) : (
          <form onSubmit={handleRequest}>
            {(error || (myItems.length === 0 && pageError)) && (
              <p className={styles.error}>{error || pageError}</p>
            )}
            {item && (
              <>
                <section className={styles.section}>
                  <h2>1) 교환 대상</h2>
                  {includeGroupId && item.groups.length > 1 && (
                    <label className={styles.groupField}>
                      교환을 진행할 그룹
                      <select
                        value={groupId ?? ''}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          setGroupId(
                            event.target.value
                              ? Number(event.target.value)
                              : null,
                          )
                        }
                      >
                        <option value="">그룹을 선택해주세요</option>
                        {item.groups.map((group) => (
                          <option key={group.groupId} value={group.groupId}>
                            {group.groupName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {includeGroupId && item.groups.length === 0 && (
                    <p className={styles.message}>
                      이 물품에 연결된 그룹이 없습니다.
                    </p>
                  )}
                  <div className={styles.targetCard}>
                    <ItemImage
                      url={
                        item.images.toSorted(
                          (a, b) => a.displayOrder - b.displayOrder,
                        )[0]?.imageUrl
                      }
                    />
                    <div className={styles.info}>
                      <h3>{item.title}</h3>
                      <p className={styles.description}>{item.content}</p>
                      <div className={styles.meta}>
                        <QuantityControl
                          value={requestedQuantity}
                          maximum={item.quantity}
                          variant={closeHref ? undefined : 'requestTarget'}
                          disabled={
                            isSubmitting ||
                            item.itemState !== 'AVAILABLE' ||
                            item.quantity < 1
                          }
                          onChange={setRequestedQuantity}
                        />
                        <span>보유 수량: {item.quantity}</span>
                        <span className={styles.badge}>
                          상태: {getItemStateLabel(item.itemState)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(item.itemState !== 'AVAILABLE' || item.quantity < 1) && (
                    <p className={styles.message}>
                      현재 교환할 수 없는 물품입니다.
                    </p>
                  )}
                </section>
                <section className={styles.section}>
                  <h2>2) 내 물품 선택 ({selectedIds.length})</h2>
                  <div className={styles.list}>
                    {myItems.length === 0 ? (
                      <p className={styles.message}>
                        내가 등록한 물품이 없습니다.
                      </p>
                    ) : (
                      visibleItems.map((owned) => (
                        <OfferingItemCard
                          key={owned.itemId}
                          item={owned}
                          selected={selectedIds.includes(owned.itemId)}
                          quantity={offeredQuantities[owned.itemId] ?? 1}
                          disabled={isSubmitting}
                          requestPage={!closeHref}
                          onSelectionChange={(selected) =>
                            setSelectedIds((ids) =>
                              selected
                                ? [...ids, owned.itemId]
                                : ids.filter((id) => id !== owned.itemId),
                            )
                          }
                          onQuantityChange={(value) =>
                            setOfferedQuantities((quantities) => ({
                              ...quantities,
                              [owned.itemId]: value,
                            }))
                          }
                        />
                      ))
                    )}
                  </div>
                  {myItems.length > 0 && (
                    <nav
                      className={styles.pagination}
                      aria-label="내 물품 페이지"
                    >
                      <button
                        type="button"
                        disabled={
                          !canGoPrevious || isSubmitting || isFetchingMore
                        }
                        onClick={goToPreviousPage}
                      >
                        이전
                      </button>
                      <span aria-live="polite">
                        {currentPage} / {pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={!canGoNext || isSubmitting || isFetchingMore}
                        onClick={goToNextPage}
                      >
                        다음
                      </button>
                    </nav>
                  )}
                  {isFetchingMore && (
                    <p className={styles.message} role="status">
                      다음 물품을 불러오는 중입니다.
                    </p>
                  )}
                  {pageError && (
                    <div className={styles.pageError}>
                      <p className={styles.error} role="alert">
                        {pageError}
                      </p>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={retry}
                      >
                        다시 불러오기
                      </button>
                    </div>
                  )}
                </section>
                <section className={styles.section}>
                  <h2>3) {submitLabel}</h2>
                  <button
                    className={styles.requestButton}
                    type="submit"
                    disabled={!canRequest || isSubmitting}
                  >
                    {isSubmitting ? '처리 중...' : submitLabel}
                  </button>
                  <div className={styles.selectedItems}>
                    <h3>선택한 물품 ({selectedItems.length})</h3>
                    {selectedItems.length === 0 ? (
                      <p className={styles.hint}>
                        교환할 내 물품을 1개 이상 선택해주세요.
                      </p>
                    ) : (
                      <ul className={styles.selectedList}>
                        {selectedItems.map((owned) => (
                          <li key={owned.itemId} className={styles.offerCard}>
                            <ItemImage url={owned.thumbnailImageUrl} />
                            <div className={styles.info}>
                              <h3>{owned.title}</h3>
                              <p className={styles.meta}>
                                제안 수량:{' '}
                                {offeredQuantities[owned.itemId] ?? 1}개
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.removeButton}
                              aria-label={`${owned.title} 선택 해제`}
                              disabled={isSubmitting}
                              onClick={() =>
                                setSelectedIds((ids) =>
                                  ids.filter((id) => id !== owned.itemId),
                                )
                              }
                            >
                              해제
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
