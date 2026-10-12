'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import Navbar from '@/components/common/navbar/Navbar'
import ItemCard from '@/components/item/ItemCard'
import ItemSearchBar from '@/components/search/ItemSearchBar'
import type { JoinedGroupOption } from '@/types/group'
import type { ItemListItem, ItemListResponse } from '@/types/item'
import type {
  SearchHistory,
  SearchHistoryResponse,
} from '@/types/searchHistory'
import styles from './page.module.css'

type SearchCriteria = {
  keyword: string
  groupId: number
}

type SearchResult = SearchCriteria & {
  items: ItemListItem[]
  nextCursor: string | null
  hasNext: boolean
}

type SearchRequest = {
  criteria: SearchCriteria
  cursor: string | null
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message || fallback
  }
  return fallback
}

function parseGroups(value: string | null): JoinedGroupOption[] {
  if (!value) return []
  try {
    const groups: unknown = JSON.parse(value)
    if (!Array.isArray(groups)) return []
    return groups.filter(
      (group): group is JoinedGroupOption =>
        group !== null &&
        typeof group === 'object' &&
        Number.isSafeInteger(group.groupId) &&
        group.groupId > 0 &&
        typeof group.groupName === 'string',
    )
  } catch {
    return []
  }
}

function SearchPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups] = useState(() => parseGroups(searchParams.get('groups')))
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(() => {
    const requestedId = Number(searchParams.get('groupId'))
    return (
      groups.find((group) => group.groupId === requestedId)?.groupId ??
      groups[0]?.groupId ??
      null
    )
  })
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null)
  const [searchHistories, setSearchHistories] = useState<SearchHistory[]>([])
  const [historyError, setHistoryError] = useState(false)
  const [deletingHistoryId, setDeletingHistoryId] = useState<number | null>(
    null,
  )
  const [isDeleteErrorOpen, setIsDeleteErrorOpen] = useState(false)
  const [isSmartSearchNoticeOpen, setIsSmartSearchNoticeOpen] = useState(false)

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
    }
  }, [router])

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) return
    const controller = new AbortController()

    async function loadSearchHistories() {
      try {
        const response = await axios.get<SearchHistoryResponse>(
          '/bff/search-histories',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )
        if (controller.signal.aborted) return
        setSearchHistories(response.data.data.searchHistories)
        setHistoryError(false)
      } catch (error) {
        if (!axios.isCancel(error) && !controller.signal.aborted) {
          setSearchHistories([])
          setHistoryError(true)
        }
      }
    }

    void loadSearchHistories()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!searchRequest) return

    const controller = new AbortController()
    const { criteria, cursor } = searchRequest

    async function searchItems() {
      const token = window.sessionStorage.getItem('accessToken')
      if (!token) {
        router.replace('/auth/login')
        return
      }

      try {
        const response = await axios.get<ItemListResponse>('/bff/search', {
          params: {
            groupId: criteria.groupId,
            keyword: criteria.keyword,
            ...(cursor ? { cursor } : {}),
          },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const page = response.data.data
        if (cursor) {
          setResult((current) =>
            current?.groupId === criteria.groupId &&
            current.keyword === criteria.keyword
              ? {
                  ...criteria,
                  items: [...current.items, ...page.items],
                  nextCursor: page.nextCursor,
                  hasNext: page.hasNext,
                }
              : current,
          )
        } else {
          setResult({
            ...criteria,
            items: page.items,
            nextCursor: page.nextCursor,
            hasNext: page.hasNext,
          })
        }
      } catch (error) {
        if (!axios.isCancel(error) && !controller.signal.aborted) {
          setSearchError(
            getErrorMessage(error, '검색 결과를 불러오지 못했습니다.'),
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          if (cursor) setMoreLoading(false)
          else setIsLoading(false)
        }
      }
    }

    void searchItems()
    return () => controller.abort()
  }, [searchRequest, router])

  function handleSearchClick() {
    if (!keyword.trim()) return
    if (selectedGroupId === null) {
      setSearchError('검색할 그룹을 선택해주세요.')
      return
    }
    const criteria = { groupId: selectedGroupId, keyword: keyword.trim() }
    setResult(null)
    setSearchError('')
    setIsLoading(true)
    setMoreLoading(false)
    setSearchRequest({ criteria, cursor: null })
  }

  function loadMore() {
    if (!result?.hasNext || !result.nextCursor || moreLoading) return
    setMoreLoading(true)
    setSearchError('')
    setSearchRequest({
      criteria: { groupId: result.groupId, keyword: result.keyword },
      cursor: result.nextCursor,
    })
  }

  function changeCriteria() {
    setSearchRequest(null)
    setResult(null)
    setSearchError('')
    setIsLoading(false)
    setMoreLoading(false)
  }

  async function deleteSearchHistory(searchHistoryId: number) {
    if (deletingHistoryId !== null) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }

    setDeletingHistoryId(searchHistoryId)
    try {
      const response = await axios.delete(
        `/bff/search-histories/${searchHistoryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )
      if (response.status !== 204) throw new Error('Unexpected delete response')
      setSearchHistories((current) =>
        current.filter(
          (history) => history.searchHistoryId !== searchHistoryId,
        ),
      )
    } catch {
      setIsDeleteErrorOpen(true)
    } finally {
      setDeletingHistoryId(null)
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            &lt;
          </button>
          <h1>물품 검색</h1>
        </div>
      </header>

      <ItemSearchBar
        groups={groups}
        selectedGroupId={selectedGroupId}
        keyword={keyword}
        disabled={isLoading}
        onGroupChange={(groupId) => {
          setSelectedGroupId(groupId)
          changeCriteria()
        }}
        onKeywordChange={(value) => {
          setKeyword(value)
          changeCriteria()
        }}
        onSearch={handleSearchClick}
      />

      {historyError ? (
        <p className={styles.historyError}>
          검색 기록을 가져오는데 실패했습니다
        </p>
      ) : searchHistories.length > 0 ? (
        <div className={styles.searchHistories}>
          {searchHistories.map((history) => (
            <span className={styles.historyChip} key={history.searchHistoryId}>
              <span>{history.keyword}</span>
              <button
                type="button"
                className={styles.historyRemove}
                onClick={() =>
                  void deleteSearchHistory(history.searchHistoryId)
                }
                disabled={deletingHistoryId !== null}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {groups.length === 0 && (
        <p className={styles.searchMessage}>
          그룹 정보를 사용하려면 <Link href="/pages/items">물품 목록</Link>에서
          검색을 열어주세요.
        </p>
      )}
      {searchError && <p className={styles.searchMessage}>{searchError}</p>}

      <button
        type="button"
        className={styles.smartSearchLink}
        onClick={() => setIsSmartSearchNoticeOpen(true)}
      >
        <span className={styles.sparkle}>✦</span>
        AI 스마트 검색
        <span className={styles.chevron}>›</span>
        <span className={styles.soonLabel}>soon</span>
      </button>

      {isLoading ? (
        <p className={styles.resultMessage}>검색 결과를 불러오는 중입니다.</p>
      ) : result ? (
        <section className={styles.results}>
          <h2 className={styles.resultTitle}>검색 결과</h2>
          {result.items.length ? (
            <div className={styles.itemList}>
              {result.items.map((item) => (
                <ItemCard key={item.itemId} item={item} />
              ))}
            </div>
          ) : (
            <p className={styles.resultMessage}>검색 결과가 없습니다.</p>
          )}
          {result.hasNext && (
            <button
              type="button"
              className={styles.moreButton}
              onClick={loadMore}
              disabled={moreLoading}
            >
              {moreLoading ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </section>
      ) : null}
      {isSmartSearchNoticeOpen && (
        <ModalDefault
          message="AI 스마트 검색은 개발 중입니다."
          onConfirm={() => setIsSmartSearchNoticeOpen(false)}
        />
      )}
      {isDeleteErrorOpen && (
        <ModalDefault
          message="서버 문제로 검색 기록을 삭제하지 못했습니다."
          onConfirm={() => setIsDeleteErrorOpen(false)}
        />
      )}
      <Navbar />
    </section>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  )
}
