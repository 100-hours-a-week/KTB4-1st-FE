'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { API_BASE_URL } from '@/config/api'
import type { ItemDetail, ItemDetailResponse, ItemListItem } from '@/types/item'
import { getUserIdFromAccessToken } from '@/utils/auth'
import { getItemStateLabel } from '@/utils/item'
import styles from './page.module.css'

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

function QuantityControl({
  value,
  maximum,
  disabled = false,
  onChange,
}: {
  value: number
  maximum: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className={styles.quantity}>
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <span>{value}</span>
      <button
        type="button"
        disabled={disabled || value >= maximum}
        onClick={() => onChange(Math.min(maximum, value + 1))}
      >
        +
      </button>
    </div>
  )
}

function ItemImage({ url }: { url?: string | null }) {
  return (
    <div
      className={styles.image}
      style={
        url
          ? { backgroundImage: `url("${url.replaceAll('"', '%22')}")` }
          : undefined
      }
    >
      {!url && (
        <svg viewBox="0 0 24 24">
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <circle cx="9" cy="9.5" r="1.5" />
          <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
        </svg>
      )}
    </div>
  )
}

function ExchangeForm({ itemId }: { itemId: string | null }) {
  const router = useRouter()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [myItems, setMyItems] = useState<Omit<ItemListItem, 'owner'>[]>([])
  const [requestedQuantity, setRequestedQuantity] = useState(1)
  const [offeredQuantities, setOfferedQuantities] = useState<
    Record<number, number>
  >({})
  const [selectedIds, setSelectedIds] = useState<number[]>([])
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
        const targetId = Number(itemId)
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
    offeredItems.length > 0

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
      await axios.post(
        `${API_BASE_URL}/items/${item.itemId}/exchange-requests`,
        { requestedQuantity, offeredItems },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      router.push('/pages/chat')
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        router.replace('/auth/login')
        return
      }
      setError(
        getErrorMessage(cause, '교환 요청에 실패했습니다. 다시 시도해주세요.'),
      )
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>교환 요청</h1>
        <Link
          className={styles.close}
          href={item ? `/pages/items/${item.itemId}` : '/pages/items'}
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
                    myItems.map((owned) => {
                      const unavailable =
                        owned.itemState !== 'AVAILABLE' || owned.quantity < 1
                      return (
                        <div className={styles.offerCard} key={owned.itemId}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(owned.itemId)}
                            disabled={isSubmitting || unavailable}
                            onChange={(event) =>
                              setSelectedIds((ids) =>
                                event.target.checked
                                  ? [...ids, owned.itemId]
                                  : ids.filter((id) => id !== owned.itemId),
                              )
                            }
                          />
                          <ItemImage url={owned.thumbnailImageUrl} />
                          <div className={styles.info}>
                            <h3>{owned.title}</h3>
                            <div className={styles.meta}>
                              <span>보유 수량: {owned.quantity}</span>
                              <QuantityControl
                                value={offeredQuantities[owned.itemId] ?? 1}
                                maximum={owned.quantity}
                                disabled={isSubmitting || unavailable}
                                onChange={(value) =>
                                  setOfferedQuantities((quantities) => ({
                                    ...quantities,
                                    [owned.itemId]: value,
                                  }))
                                }
                              />
                              {unavailable && (
                                <span className={styles.badge}>교환 불가</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
              <section className={styles.section}>
                <h2>3) 요청하기</h2>
                <button
                  className={styles.requestButton}
                  type="submit"
                  disabled={!canRequest || isSubmitting}
                >
                  {isSubmitting ? '요청 중...' : '요청하기'}
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

function ExchangePageContent() {
  const searchParams = useSearchParams()
  const itemId = searchParams.get('itemId')
  return <ExchangeForm key={itemId} itemId={itemId} />
}

export default function ExchangePage() {
  return (
    <Suspense
      fallback={
        <p className={styles.message}>물품 정보를 불러오는 중입니다.</p>
      }
    >
      <ExchangePageContent />
    </Suspense>
  )
}
