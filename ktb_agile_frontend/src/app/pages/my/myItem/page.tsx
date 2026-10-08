'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import { getItemStateLabel } from '@/utils/item'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import '@/config/api'
import styles from './page.module.css'

function MyItemCard({ item }: { item: MyItemListItem }) {
  const isAvailable = item.itemState === 'AVAILABLE'
  const href = `/pages/items/${item.itemId}`
  
  return (
    <Link className={styles.card} href={href}>
      <div
        className={styles.thumbnail}
        style={
          item.thumbnailImageUrl
            ? {
                backgroundImage: `url("${item.thumbnailImageUrl.replaceAll('"', '%22')}")`,
              }
            : undefined
        }
      >
        {!item.thumbnailImageUrl && (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
            <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
          </svg>
        )}
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardHeading}>
          <span className={styles.groupName}>
            {item.groups.map((group) => group.groupName).join(' · ') ||
              '그룹 정보 없음'}
          </span>
          <span
            className={`${styles.status} ${isAvailable ? styles.available : styles.unavailable}`}
          >
            {getItemStateLabel(item.itemState)}
          </span>
        </div>
        <h2 className={styles.cardTitle}>{item.title}</h2>
        <p className={styles.preview}>{item.contentPreview}</p>
        <div className={styles.meta}>
          <span>수량 {item.quantity}개</span>
          <span>관심 {item.likeCount}</span>
          <span>교환 요청 {item.exchangeRequestCount}</span>
        </div>
      </div>
    </Link>
  )
}

export default function MyItemPage() {
  const router = useRouter()
  const [items, setItems] = useState<MyItemListItem[]>([])
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

    async function loadItems() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await axios.get<MyItemListResponse>('/bff/my-items', {
          params: { ...(cursor ? { cursor } : {}) },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        const page = response.data.data

        if (!page || response.data.error) {
          throw new Error(
            response.data.error?.message || '물품 목록을 불러오지 못했습니다.',
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
                '물품 목록을 불러오지 못했습니다.'
            : error instanceof Error
              ? error.message
              : '물품 목록을 불러오지 못했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadItems()

    return () => controller.abort()
  }, [cursor, retryCount, router])

  return (
    <>
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backButton} href="/pages/my">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m12 5-7 7 7 7M5 12h14" />
            </svg>
          </Link>
          <h1>내가 올린 상품</h1>
          <span />
        </header>

        {items.length > 0 && (
          <ul className={styles.itemList}>
            {items.map((item) => (
              <li key={item.itemId}>
                <MyItemCard item={item} />
              </li>
            ))}
          </ul>
        )}

        {isLoading && (
          <p className={styles.message}>물품 목록을 불러오는 중입니다.</p>
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
          <div className={styles.emptyState}>
            <span>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
                <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
              </svg>
            </span>
            <h2>아직 올린 상품이 없어요</h2>
            <p>첫 물품을 등록하고 이웃과 교환해 보세요.</p>
            <Link
              className={styles.registerButton}
              href="/pages/items/register"
            >
              물품 등록하기
            </Link>
          </div>
        )}

        {!isLoading && !errorMessage && hasNext && nextCursor && (
          <button
            className={styles.moreButton}
            type="button"
            onClick={() => setCursor(nextCursor)}
          >
            더 보기
          </button>
        )}
      </section>
      <Navbar />
    </>
  )
}
