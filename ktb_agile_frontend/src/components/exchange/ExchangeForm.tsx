'use client'

import { EXCHANGE_ERRORS } from '@/constants/errors/exchange'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { API_BASE_URL } from '@/config/api'
import type {
  ItemDetail,
  ItemDetailResponse,
  OfferableItem,
} from '@/types/item'
import { getUserIdFromAccessToken, redirectToLogin } from '@/utils/auth'
import { getItemStateLabel, isItemAvailable } from '@/utils/item'
import ExchangeMyItemList from './ExchangeMyItemList'
import QuantityControl from '../common/exchange/QuantityControl'
import ItemImage from './ItemImage'
import styles from './ExchangeForm.module.css'

function getErrorMessage(cause: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: { message?: string } }>(cause)) {
    return cause.response?.data?.error?.message || fallback
  }
  return cause instanceof Error ? cause.message : fallback
}

function getThumbnailUrl(item: ItemDetail) {
  return (
    item.images.toSorted((a, b) => a.displayOrder - b.displayOrder)[0]
      ?.imageUrl ?? null
  )
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
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
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
  // 그룹을 바꾸거나 페이지를 넘겨도 선택한 물품 정보를 유지하도록 물품 자체를 저장합니다.
  const [selectedItems, setSelectedItems] = useState<OfferableItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadTarget() {
      const accessToken = sessionStorage.getItem('accessToken')
      const userId = accessToken ? getUserIdFromAccessToken(accessToken) : null
      if (!userId) {
        redirectToLogin(router)
        return
      }
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      }
      setIsLoading(true)
      setLoadError(null)
      try {
        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
          throw new Error(EXCHANGE_ERRORS.ITEM_ID_INVALID)
        }
        const response = await axios.get<ItemDetailResponse>(
          `${API_BASE_URL}/items/${itemId}`,
          { headers, signal: controller.signal },
        )
        const target = response.data.data
        if (target.owner.userId === userId) {
          throw new Error(EXCHANGE_ERRORS.OWN_ITEM_NOT_ALLOWED)
        }
        // 수정할 기존 제안의 물품은 그룹 목록을 불러오기 전에도 선택 상태로 보여줍니다.
        const initialSelected = await Promise.all(
          initialOfferedIds.current.map(async (id): Promise<OfferableItem> => {
            const response = await axios.get<ItemDetailResponse>(
              `${API_BASE_URL}/items/${id}`,
              { headers, signal: controller.signal },
            )
            const detail = response.data.data
            return {
              itemId: detail.itemId,
              title: detail.title,
              thumbnailImageUrl: getThumbnailUrl(detail),
              quantity: detail.quantity,
              itemState: detail.itemState,
              groups: detail.groups,
            }
          }),
        )
        if (controller.signal.aborted) return
        setItem(target)
        setGroupId(target.groups.length === 1 ? target.groups[0].groupId : null)
        setSelectedItems(initialSelected)
      } catch (cause) {
        if (controller.signal.aborted) return
        setLoadError(getErrorMessage(cause, EXCHANGE_ERRORS.ITEM_LOOKUP_FAILED))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadTarget()
    return () => controller.abort()
  }, [itemId, router, retryCount])

  function changeGroup(nextGroupId: number | null) {
    setGroupId(nextGroupId)
    // 다른 그룹의 물품은 함께 제안할 수 없으므로 선택에서 뺍니다.
    setSelectedItems((items) =>
      items.filter((owned) =>
        owned.groups.some((group) => group.groupId === nextGroupId),
      ),
    )
  }

  const offeredItems = selectedItems.map((entry) => ({
    itemId: entry.itemId,
    quantity: offeredQuantities[entry.itemId] ?? 1,
  }))
  const canRequest =
    !!item &&
    isItemAvailable(item) &&
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
        const owned = selectedItems.find(
          (entry) => entry.itemId === offered.itemId,
        )
        return (
          !owned ||
          !isItemAvailable(owned) ||
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
            {loadError && (
              <div className={styles.pageError}>
                <p className={styles.error} role="alert">
                  {loadError}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  다시 불러오기
                </button>
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            {item && (
              <>
                <section className={styles.section}>
                  <h2>1) 교환 대상</h2>
                  {item.groups.length > 1 && (
                    <label className={styles.groupField}>
                      교환을 진행할 그룹
                      <select
                        value={groupId ?? ''}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          changeGroup(
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
                  {item.groups.length === 0 && (
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
                          disabled={isSubmitting || !isItemAvailable(item)}
                          onChange={setRequestedQuantity}
                        />
                        <span>보유 수량: {item.quantity}</span>
                        <span className={styles.badge}>
                          상태: {getItemStateLabel(item.itemState)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isItemAvailable(item) && (
                    <p className={styles.message}>
                      현재 교환할 수 없는 물품입니다.
                    </p>
                  )}
                </section>
                <section className={styles.section}>
                  <h2>2) 내 물품 선택 ({selectedItems.length})</h2>
                  {groupId === null ? (
                    item.groups.length > 0 && (
                      <p className={styles.message}>
                        그룹을 선택하면 그 그룹에 등록한 내 물품이 표시됩니다.
                      </p>
                    )
                  ) : (
                    <ExchangeMyItemList
                      key={groupId}
                      groupId={groupId}
                      selectedIds={selectedItems.map((owned) => owned.itemId)}
                      quantities={offeredQuantities}
                      disabled={isSubmitting}
                      requestPage={!closeHref}
                      onSelectionChange={(owned, selected) =>
                        setSelectedItems((items) =>
                          selected
                            ? [...items, owned]
                            : items.filter(
                                (entry) => entry.itemId !== owned.itemId,
                              ),
                        )
                      }
                      onQuantityChange={(id, value) =>
                        setOfferedQuantities((quantities) => ({
                          ...quantities,
                          [id]: value,
                        }))
                      }
                    />
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
                                setSelectedItems((items) =>
                                  items.filter(
                                    (entry) => entry.itemId !== owned.itemId,
                                  ),
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
