'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import AiSmartSearchGroupDropdown from '@/components/smart-search/AiSmartSearchGroupDropdown'
import AiSmartSearchMyItemList from '@/components/smart-search/AiSmartSearchMyItemList'
import { useSmartSearch } from '@/components/smart-search/SmartSearchProvider'
import type {
  SmartSearchRequest,
  SmartSearchResponse,
} from '@/types/smartSearch'
import styles from './page.module.css'

const SEARCH_FAILED_MESSAGE = '스마트 검색 결과를 불러오지 못했습니다.'

export default function Page() {
  const router = useRouter()
  const { groupId, items, preferenceText, setPreferenceText } =
    useSmartSearch()
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  // 검색한 뒤 조건이 바뀌면 이전 결과 안내는 더 이상 보여주지 않는다.
  const [searchResult, setSearchResult] = useState<{
    count: number
    request: string
  } | null>(null)

  const currentRequest = JSON.stringify({ groupId, items, preferenceText })

  async function search() {
    if (isSearching || items.length === 0 || !groupId) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)

    const request: SmartSearchRequest = {
      groupId,
      items,
      preferenceText: preferenceText.trim(),
    }

    try {
      const response = await axios.post<SmartSearchResponse>(
        '/bff/smart-search',
        request,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )
      if (!response.data.data || response.data.error) {
        throw new Error(response.data.error?.message || SEARCH_FAILED_MESSAGE)
      }
      setSearchResult({
        count: response.data.data.items.length,
        request: currentRequest,
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return
      }

      setSearchError(
        axios.isAxiosError<SmartSearchResponse>(error)
          ? error.response?.data.error?.message || SEARCH_FAILED_MESSAGE
          : error instanceof Error
            ? error.message
            : SEARCH_FAILED_MESSAGE,
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m12 5-7 7 7 7M5 12h14" />
            </svg>
          </button>
          <h1>스마트 검색</h1>
          <span />
        </header>

        <section className={styles.intro}>
          <span className={styles.avatar}>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3" />
              <path d="M5.5 20v-2a6.5 6.5 0 0 1 13 0v2" />
            </svg>
          </span>
          <p>
            <strong>스마트 비서</strong>
            <br />
            교환을 원하시는 품목을 모두 선택하시고 원하시는 검색 내용을
            입력해주세요.
          </p>
        </section>

        <AiSmartSearchGroupDropdown />

        {groupId !== null && (
          <AiSmartSearchMyItemList key={groupId} groupId={groupId} />
        )}

        <section className={styles.conditionSection}>
          <h2>교환을 희망하는 조건</h2>
          <textarea
            placeholder="예) 과자 물 칫솔 등과 바꾸고 싶어"
            value={preferenceText}
            onChange={(event) => setPreferenceText(event.target.value)}
          />
        </section>

        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.searchButton}
            disabled={isSearching || items.length === 0 || !groupId}
            onClick={() => void search()}
          >
            {isSearching ? '검색 중...' : '검색하기'}
          </button>
          {searchResult?.request === currentRequest && (
            <p className={styles.searchMessage} role="status">
              검색 결과 {searchResult.count}건을 가져왔습니다.
            </p>
          )}
        </div>
      </div>
      {searchError && (
        <ModalDefault
          message={searchError}
          onConfirm={() => setSearchError(null)}
        />
      )}
    </main>
  )
}
