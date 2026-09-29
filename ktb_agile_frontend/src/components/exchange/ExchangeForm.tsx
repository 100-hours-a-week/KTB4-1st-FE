'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { API_BASE_URL } from '@/config/api'
import type { ItemDetail, ItemDetailResponse, ItemListItem } from '@/types/item'
import { getUserIdFromAccessToken } from '@/utils/auth'
import { getItemStateLabel } from '@/utils/item'
import OfferingItemCard from './OfferingItemCard'
import QuantityControl from './QuantityControl'
import ItemImage from './ItemImage'
import styles from './ExchangeForm.module.css'

type MyItemsResponse = {
  data: {
    items: Omit<ItemListItem, 'owner'>[]
    nextCursor: string | null
    hasNext: boolean
  }
  error: null
}

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
  const [myItems, setMyItems] = useState<Omit<ItemListItem, 'owner'>[]>([])
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    async function loadItems() {
      const accessToken = sessionStorage.getItem('accessToken')
      const userId = accessToken ? getUserIdFromAccessToken(accessToken) : null
      if (!userId) {
        router.replace('/auth/login')
        return
      }

      try {
        const targetId = itemId
        if (!Number.isSafeInteger(targetId) || targetId <= 0) {
          throw new Error('올바른 물품 ID가 필요합니다.')
        }

        const headers = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        }
        const response = await axios.get<ItemDetailResponse>(
          `${API_BASE_URL}/items/${targetId}`,
          { headers, signal: controller.signal },
        )
        const target = response.data.data
        if (target.owner.userId === userId) {
          throw new Error('내 물품에는 교환 요청을 보낼 수 없습니다.')
        }
        const ownedItems: Omit<ItemListItem, 'owner'>[] = []
        let cursor: string | null = null
        const seenCursors = new Set<string>()
        while (true) {
          const myResponse: { data: MyItemsResponse } =
            await axios.get<MyItemsResponse>(`${API_BASE_URL}/users/me/items`, {
              params: { size: 10, ...(cursor ? { cursor } : {}) },
              headers,
              signal: controller.signal,
            })
          const page = myResponse.data.data
          ownedItems.push(...page.items)
          if (!page.hasNext) break
          if (!page.nextCursor || seenCursors.has(page.nextCursor)) {
            throw new Error('내 물품 목록의 다음 페이지를 불러올 수 없습니다.')
          }
          cursor = page.nextCursor
          seenCursors.add(cursor)
        }
        if (!active) return
        setItem(target)
        setGroupId(target.groups.length === 1 ? target.groups[0].groupId : null)
        setMyItems(ownedItems)
      } catch (cause) {
        if (!active || axios.isCancel(cause)) return
        if (axios.isAxiosError(cause) && cause.response?.status === 401) {
          router.replace('/auth/login')
          return
        }
        setError(getErrorMessage(cause, '물품 조회에 실패했습니다.'))
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadItems()
    return () => {
      active = false
      controller.abort()
    }
  }, [itemId, router])

  const offeredItems = myItems
    .filter((entry) => selectedIds.includes(entry.itemId))
    .map((entry) => ({
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
      router.replace('/auth/login')
      return
    }
    const validQuantity = (quantity: number, stock: number) =>
      Number.isInteger(quantity) && quantity >= 1 && quantity <= stock
    if (
      !validQuantity(requestedQuantity, item.quantity) ||
      offeredItems.some((offered) => {
        const owned = myItems.find((entry) => entry.itemId === offered.itemId)
        return (
          !owned ||
          owned.itemState !== 'AVAILABLE' ||
          !validQuantity(offered.quantity, owned.quantity)
        )
      })
    ) {
      setError('수량은 1개 이상, 보유 수량 이하로 선택해주세요.')
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
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        router.replace('/auth/login')
        return
      }
      setError(
        getErrorMessage(cause, '처리에 실패했습니다. 다시 시도해주세요.'),
      )
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{initialValues ? '교환 요청 수정' : '교환 요청'}</h1>
        <Link
          className={styles.close}
          href={
            closeHref ?? (item ? `/pages/items/${item.itemId}` : '/pages/items')
          }
        >
          ×
        </Link>
      </header>
      {isLoading ? (
        <p className={styles.message}>물품 정보를 불러오는 중입니다.</p>
      ) : (
        <form onSubmit={handleRequest}>
          {error && <p className={styles.error}>{error}</p>}
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
                        setGroupId(event.target.value ? Number(event.target.value) : null)
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
                  <p className={styles.message}>이 물품에 연결된 그룹이 없습니다.</p>
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
                      <span>보유 수량: {item.quantity}</span>
                      <QuantityControl
                        value={requestedQuantity}
                        maximum={item.quantity}
                        disabled={
                          isSubmitting ||
                          item.itemState !== 'AVAILABLE' ||
                          item.quantity < 1
                        }
                        onChange={setRequestedQuantity}
                      />
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
                    myItems.map((owned) => (
                      <OfferingItemCard
                        key={owned.itemId}
                        item={owned}
                        selected={selectedIds.includes(owned.itemId)}
                        quantity={offeredQuantities[owned.itemId] ?? 1}
                        disabled={isSubmitting}
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
                <p className={styles.hint}>
                  교환할 내 물품을 1개 이상 선택해주세요.
                </p>
              </section>
            </>
          )}
        </form>
      )}
    </div>
  )
}
