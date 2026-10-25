'use client'

import axios from 'axios'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import '@/config/api'
import { setCurrentGroupId } from '@/utils/currentGroup'
import ModalDefault from '@/components/common/modal/Default'
import Navbar from '@/components/common/navbar/Navbar'
import ItemCard from '@/components/common/item/ItemCard'
import ItemSearchBar from '@/components/search/ItemSearchBar'
import type { JoinedGroupOption } from '@/types/group'
import type { ItemListItem, ItemListResponse } from '@/types/item'
import type { SearchHistoryResponse } from '@/types/searchHistory'
import styles from './page.module.css'
import { getAccessTokenOrRedirect } from '@/utils/auth'

type SearchCriteria = {
  keyword: string
  groupId: number
  itemState: 'AVAILABLE' | null
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

type DisplaySearchHistory = {
  searchHistoryId: number | null
  keyword: string
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
  const [isCheckBoxSelected, setIsCheckBoxSelected] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null)
  const [searchHistories, setSearchHistories] = useState<
    DisplaySearchHistory[]
  >([])
  const [historyError, setHistoryError] = useState(false)
  const [deletingHistoryKeyword, setDeletingHistoryKeyword] = useState<
    string | null
  >(null)
  const [isDeletingAllHistories, setIsDeletingAllHistories] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  )

  useEffect(() => {
    getAccessTokenOrRedirect(router)
  }, [router])

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
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
        const histories = response.data.data.searchHistories
        setSearchHistories((current) =>
          [
            ...current.map(
              (history) =>
                histories.find((saved) => saved.keyword === history.keyword) ??
                history,
            ),
            ...histories.filter(
              (history) =>
                !current.some((entry) => entry.keyword === history.keyword),
            ),
          ].slice(0, 10),
        )
        setHistoryError(false)
      } catch (error) {
        if (!axios.isCancel(error) && !controller.signal.aborted) {
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
      const token = getAccessTokenOrRedirect(router)
      if (!token) return

      try {
        const response = await axios.get<ItemListResponse>('/bff/search', {
          params: {
            groupId: criteria.groupId,
            keyword: criteria.keyword,
            ...(criteria.itemState ? { itemState: criteria.itemState } : {}),
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
        setCurrentGroupId(criteria.groupId)
        if (cursor) {
          setResult((current) =>
            current?.groupId === criteria.groupId &&
            current.keyword === criteria.keyword &&
            current.itemState === criteria.itemState
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
          setSearchHistories((current) =>
            [
              current.find(
                (history) => history.keyword === criteria.keyword,
              ) ?? {
                searchHistoryId: null,
                keyword: criteria.keyword,
              },
              ...current.filter(
                (history) => history.keyword !== criteria.keyword,
              ),
            ].slice(0, 10),
          )
          setHistoryError(false)

          // History is saved asynchronously; keep the local entry until its ID is available.
          void axios
            .get<SearchHistoryResponse>('/bff/search-histories', {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
              signal: controller.signal,
            })
            .then((historyResponse) => {
              if (controller.signal.aborted) return
              const saved = historyResponse.data.data.searchHistories
              setSearchHistories((current) =>
                current.map(
                  (history) =>
                    saved.find((entry) => entry.keyword === history.keyword) ??
                    history,
                ),
              )
            })
            .catch(() => {
              // A failed synchronization must not hide locally recorded searches.
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
    const criteria: SearchCriteria = {
      groupId: selectedGroupId,
      keyword: keyword.trim(),
      itemState: isCheckBoxSelected ? 'AVAILABLE' : null,
    }
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
      criteria: {
        groupId: result.groupId,
        keyword: result.keyword,
        itemState: result.itemState,
      },
      cursor: result.nextCursor,
    })
  }

  function changeCheckBoxSelected(checked: boolean) {
    setIsCheckBoxSelected(checked)
    if (!searchRequest) return

    setResult(null)
    setSearchError('')
    setIsLoading(true)
    setMoreLoading(false)
    setSearchRequest({
      criteria: {
        ...searchRequest.criteria,
        itemState: checked ? 'AVAILABLE' : null,
      },
      cursor: null,
    })
  }

  function changeCriteria() {
    setSearchRequest(null)
    setResult(null)
    setSearchError('')
    setIsLoading(false)
    setMoreLoading(false)
  }

  async function requestAllHistoryDelete(path: string) {
    const token = getAccessTokenOrRedirect(router)
    if (!token) return false

    const response = await axios.delete(path, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
    if (response.status !== 204) throw new Error('Unexpected delete response')
    return true
  }

  async function deleteSingleSearchHistory(history: DisplaySearchHistory) {
    if (deletingHistoryKeyword !== null || isDeletingAllHistories) return

    setDeletingHistoryKeyword(history.keyword)
    try {
      let searchHistoryId = history.searchHistoryId
      if (searchHistoryId === null) {
        const token = getAccessTokenOrRedirect(router)
        if (!token) return
        const response = await axios.get<SearchHistoryResponse>(
          '/bff/search-histories',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )
        searchHistoryId =
          response.data.data.searchHistories.find(
            (entry) => entry.keyword === history.keyword,
          )?.searchHistoryId ?? null
        if (searchHistoryId === null) {
          setDeleteErrorMessage(
            '검색 기록을 저장 중입니다. 잠시 후 다시 삭제해주세요.',
          )
          return
        }
      }
      if (
        !(await requestAllHistoryDelete(
          `/bff/search-histories/${searchHistoryId}`,
        ))
      )
        return
      setSearchHistories((current) =>
        current.filter((entry) => entry.keyword !== history.keyword),
      )
    } catch {
      setDeleteErrorMessage('서버 문제로 검색 기록을 삭제하지 못했습니다.')
    } finally {
      setDeletingHistoryKeyword(null)
    }
  }

  async function deleteAllSearchHistories() {
    if (deletingHistoryKeyword !== null || isDeletingAllHistories) return

    setIsDeletingAllHistories(true)
    try {
      if (!(await requestAllHistoryDelete('/bff/search-histories'))) return
      setSearchHistories([])
    } catch {
      setDeleteErrorMessage('서버 문제로 전체 검색 기록을 삭제하지 못했습니다.')
    } finally {
      setIsDeletingAllHistories(false)
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
        isCheckBoxSelected={isCheckBoxSelected}
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
        onCheckBoxSelectedChange={changeCheckBoxSelected}
      />

      {historyError && searchHistories.length === 0 ? (
        <p className={styles.historyError}>
          검색 기록을 가져오는데 실패했습니다
        </p>
      ) : searchHistories.length > 0 ? (
        <div className={styles.historyBar}>
          <button
            type="button"
            className={styles.clearHistoriesButton}
            onClick={() => void deleteAllSearchHistories()}
            disabled={deletingHistoryKeyword !== null || isDeletingAllHistories}
          >
            전체 삭제
          </button>
          <div className={styles.searchHistories}>
            {searchHistories.map((history) => (
              <span className={styles.historyChip} key={history.keyword}>
                <span>{history.keyword}</span>
                <button
                  type="button"
                  className={styles.historyRemove}
                  onClick={() => void deleteSingleSearchHistory(history)}
                  disabled={
                    deletingHistoryKeyword !== null || isDeletingAllHistories
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {groups.length === 0 && (
        <p className={styles.searchMessage}>
          그룹 정보를 사용하려면 <Link href="/pages/items">물품 목록</Link>에서
          검색을 열어주세요.
        </p>
      )}
      {searchError && <p className={styles.searchMessage}>{searchError}</p>}

      <Link
        href="/pages/search/ai-smart-search"
        className={styles.smartSearchLink}
      >
        <span className={styles.sparkle}>✦</span>
        AI 스마트 검색
        <span className={styles.chevron}>›</span>
      </Link>

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
      {deleteErrorMessage && (
        <ModalDefault
          message={deleteErrorMessage}
          onConfirm={() => setDeleteErrorMessage(null)}
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
