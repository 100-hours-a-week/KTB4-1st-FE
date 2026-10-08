'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ActivityItemCard from '@/components/my/ActivityItemCard'
import type { LikedItem, LikedItemsResponse } from '@/types/likedItem'
import '@/config/api'
import styles from './page.module.css'

export default function LikedItemPage() {
  const router = useRouter()
  const [items, setItems] = useState<LikedItem[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
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
        const response = await axios.get<LikedItemsResponse>(
          '/bff/liked-items',
          {
            params: { ...(cursor ? { cursor } : {}) },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )
        const page = response.data.data

        if (!page || response.data.error) {
          throw new Error(
            response.data.error?.message || '관심 물품을 불러오지 못했습니다.',
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
        setSelectedGroupId(
          (current) =>
            current ??
            page.items.flatMap((item) => item.groups)[0]?.groupId ??
            null,
        )
        setNextCursor(page.nextCursor)
        setHasNext(page.hasNext)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return

        setErrorMessage(
          axios.isAxiosError<LikedItemsResponse>(error)
            ? error.response?.data.error?.message ||
                '관심 물품을 불러오지 못했습니다.'
            : error instanceof Error
              ? error.message
              : '관심 물품을 불러오지 못했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadItems()
    return () => controller.abort()
  }, [cursor, retryCount, router])

  const groups = Array.from(
    new Map(
      items.flatMap((item) =>
        item.groups.map((group) => [group.groupId, group] as const),
      ),
    ).values(),
  )
  const visibleItems = items.filter(
    (item) =>
      selectedGroupId === null ||
      item.groups.some((group) => group.groupId === selectedGroupId),
  )

  return (
    <>
      <section className={styles.page}>
        <header className={styles.header}>
          <Link className={styles.backButton} href="/pages/my">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m12 5-7 7 7 7M5 12h14" />
            </svg>
          </Link>
          <h1>관심 물품</h1>
          <span />
        </header>

        {groups.length > 0 && (
          <div className={styles.binder}>
            {groups.map((group) => (
              <button
                key={group.groupId}
                className={`${styles.folder} ${selectedGroupId === group.groupId ? styles.selected : ''}`}
                type="button"
                onClick={() => setSelectedGroupId(group.groupId)}
              >
                {group.groupName}
              </button>
            ))}
          </div>
        )}

        {visibleItems.length > 0 && (
          <ul className={styles.itemList}>
            {visibleItems.map((item) => (
              <li key={item.itemId}>
                <ActivityItemCard
                  item={item}
                  groupId={selectedGroupId ?? undefined}
                />
              </li>
            ))}
          </ul>
        )}

        {isLoading && (
          <p className={styles.message}>관심 물품을 불러오는 중입니다.</p>
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
            <h2>아직 좋아요 누른 물품이 없어요</h2>
            <p>마음에 드는 물품을 구경해 보시겠어요?</p>
            <Link className={styles.homeButton} href="/pages/items">
              물품 구경하러 가기
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
