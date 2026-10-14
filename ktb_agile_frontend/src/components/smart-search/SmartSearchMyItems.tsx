'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import '@/config/api'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import { getItemStateLabel } from '@/utils/item'
import styles from './SmartSearchMyItems.module.css'

export default function SmartSearchMyItems() {
  const router = useRouter()
  const [items, setItems] = useState<MyItemListItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    const controller = new AbortController()

    async function loadMyItems() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await axios.get<MyItemListResponse>('/bff/my-items', {
          params: cursor ? { cursor } : undefined,
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
  }, [cursor, retryCount, router])

  function toggleItem(itemId: number) {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    )
  }

  return (
    <>
      {items.length > 0 && (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li key={item.itemId}>
              <label className={styles.itemCard}>
                <input
                  type="checkbox"
                  checked={selectedItemIds.includes(item.itemId)}
                  disabled={item.itemState !== 'AVAILABLE'}
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
                    {item.groups.map((group) => group.groupName).join(' · ') ||
                      '그룹 정보 없음'}
                  </span>
                  <strong>{item.title}</strong>
                  <span className={styles.preview}>{item.contentPreview}</span>
                  <small>
                    수량 {item.quantity}개 · 관심 {item.likeCount} · 교환 요청{' '}
                    {item.exchangeRequestCount}
                  </small>
                </span>
                <span className={styles.itemStatus}>
                  {getItemStateLabel(item.itemState)}
                </span>
              </label>
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
      {!isLoading && !errorMessage && items.length === 0 && (
        <p className={styles.message}>내가 등록한 물품이 없습니다.</p>
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
