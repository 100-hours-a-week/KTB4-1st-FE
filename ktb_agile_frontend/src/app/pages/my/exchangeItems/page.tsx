'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ExchangeHistoryCard from '@/components/my/ExchangeHistoryCard'
import type {
  ExchangeHistory,
  ExchangedItemsResponse,
} from '@/types/exchangedItem'
import '@/config/api'
import styles from './page.module.css'

export default function ExchangeItemsPage() {
  const router = useRouter()
  const [exchanges, setExchanges] = useState<ExchangeHistory[]>([])
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

    async function loadExchanges() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await axios.get<ExchangedItemsResponse>(
          '/bff/exchanged-items',
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
            response.data.error?.message || '교환 내역을 불러오지 못했습니다.',
          )
        }

        const completedExchanges = page.items.filter(
          (exchange) => exchange.exchangeStatus === 'COMPLETED',
        )
        setExchanges((current) =>
          cursor
            ? [
                ...current,
                ...completedExchanges.filter(
                  (exchange) =>
                    !current.some(
                      (loaded) =>
                        loaded.exchangeRequestId === exchange.exchangeRequestId,
                    ),
                ),
              ]
            : completedExchanges,
        )
        setNextCursor(page.nextCursor)
        setHasNext(page.hasNext)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return

        setErrorMessage(
          axios.isAxiosError<ExchangedItemsResponse>(error)
            ? error.response?.data.error?.message ||
                '교환 내역을 불러오지 못했습니다.'
            : error instanceof Error
              ? error.message
              : '교환 내역을 불러오지 못했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadExchanges()
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
          <h1>교환 내역</h1>
          <span />
        </header>

        {exchanges.length > 0 && (
          <ul className={styles.exchangeList}>
            {exchanges.map((exchange) => (
              <li key={exchange.exchangeRequestId}>
                <ExchangeHistoryCard exchange={exchange} />
              </li>
            ))}
          </ul>
        )}

        {isLoading && (
          <p className={styles.message}>교환 내역을 불러오는 중입니다.</p>
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

        {!isLoading && !errorMessage && exchanges.length === 0 && (
          <div className={styles.emptyState}>
            <h2>아직 완료한 교환이 없어요</h2>
            <p>교환할 물품을 구경해 보시겠어요?</p>
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
