'use client'

import axios, { type AxiosResponse } from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import { GROUP_ERRORS } from '@/constants/errors/group'
import type { JoinedGroupListResponse, JoinedGroupOption } from '@/types/group'
import type { ItemListItem } from '@/types/item'
import type {
  SmartSearchRequest,
  SmartSearchResponse,
} from '@/types/smartSearch'
import SmartSearchMyItems from './SmartSearchMyItems'
import type { SelectedSmartSearchItem } from './SmartSearchMyItems'
import styles from './AiSmartSearchPage.module.css'

export default function AiSmartSearchPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<JoinedGroupOption[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedSmartSearchItem[]>(
    [],
  )
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [groupError, setGroupError] = useState<string | null>(null)
  const [groupRetryCount, setGroupRetryCount] = useState(0)
  const [preferenceText, setPreferenceText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<ItemListItem[] | null>(
    null,
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadGroups() {
      setIsLoadingGroups(true)
      setGroupError(null)

      try {
        const loadedGroups: JoinedGroupOption[] = []
        const seenCursors = new Set<string>()
        let cursor: string | null = null

        while (true) {
          const response: AxiosResponse<JoinedGroupListResponse> =
            await axios.get<JoinedGroupListResponse>('/bff/me/groups', {
              params: cursor ? { cursor } : undefined,
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            })
          if (controller.signal.aborted) return

          const page: JoinedGroupListResponse['data'] = response.data.data
          if (!page || response.data.error) {
            throw new Error(
              response.data.error?.message ||
                GROUP_ERRORS.GROUP_LIST_LOAD_FAILED,
            )
          }

          loadedGroups.push(
            ...page.groups.map(({ groupId, groupName }) => ({
              groupId,
              groupName,
            })),
          )
          if (
            !page.hasNext ||
            !page.nextCursor ||
            seenCursors.has(page.nextCursor)
          ) {
            break
          }
          seenCursors.add(page.nextCursor)
          cursor = page.nextCursor
        }

        setGroups(loadedGroups)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        if (axios.isAxiosError(error) && error.response?.status === 401) return
        setGroupError(
          axios.isAxiosError<JoinedGroupListResponse>(error)
            ? error.response?.data.error?.message ||
                GROUP_ERRORS.GROUP_LIST_LOAD_FAILED
            : error instanceof Error
              ? error.message
              : GROUP_ERRORS.GROUP_LIST_LOAD_FAILED,
        )
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false)
      }
    }

    void loadGroups()
    return () => controller.abort()
  }, [groupRetryCount])

  const groupId = selectedGroupId

  async function search() {
    if (isSearching || selectedItems.length === 0 || !groupId) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)

    const request: SmartSearchRequest = {
      groupId,
      items: selectedItems.map(({ item, quantity }) => ({
        itemId: item.itemId,
        quantity,
      })),
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
        throw new Error(
          response.data.error?.message ||
            '스마트 검색 결과를 불러오지 못했습니다.',
        )
      }
      setSearchResults(response.data.data.items)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return
      }

      setSearchError(
        axios.isAxiosError<SmartSearchResponse>(error)
          ? error.response?.data.error?.message ||
              '스마트 검색 결과를 불러오지 못했습니다.'
          : error instanceof Error
            ? error.message
            : '스마트 검색 결과를 불러오지 못했습니다.',
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

        <section className={styles.groupSection}>
          <label className={styles.groupField}>
            검색할 그룹
            <select
              value={selectedGroupId ?? ''}
              disabled={isLoadingGroups || groups.length === 0}
              onChange={(event) => {
                setSelectedGroupId(Number(event.target.value))
                setSelectedItems([])
                setSearchResults(null)
                setSearchError(null)
              }}
            >
              <option value="" disabled>
                {isLoadingGroups
                  ? '그룹을 불러오는 중...'
                  : '그룹을 선택해주세요'}
              </option>
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.groupName}
                </option>
              ))}
            </select>
          </label>
          {groupError && (
            <div className={styles.groupNotice}>
              <p role="alert">{groupError}</p>
              <button
                type="button"
                onClick={() => setGroupRetryCount((count) => count + 1)}
              >
                다시 시도
              </button>
            </div>
          )}
          {!isLoadingGroups && !groupError && groups.length === 0 && (
            <p className={styles.groupNotice}>가입한 그룹이 없습니다.</p>
          )}
        </section>

        {selectedGroupId !== null && (
          <section className={styles.itemsSection}>
            <h2>내 물건 목록</h2>
            <SmartSearchMyItems
              key={selectedGroupId}
              groupId={selectedGroupId}
              onSelectionChange={(items) => {
                setSelectedItems(items)
                setSearchResults(null)
                setSearchError(null)
              }}
            />
          </section>
        )}

        <section className={styles.conditionSection}>
          <h2>교환을 희망하는 조건</h2>
          <textarea
            placeholder="예) 과자 물 칫솔 등과 바꾸고 싶어"
            value={preferenceText}
            onChange={(event) => {
              setPreferenceText(event.target.value)
              setSearchResults(null)
              setSearchError(null)
            }}
          />
        </section>

        <div className={styles.actionArea}>
          <button
            type="button"
            className={styles.searchButton}
            disabled={isSearching || selectedItems.length === 0 || !groupId}
            onClick={() => void search()}
          >
            {isSearching ? '검색 중...' : '검색하기'}
          </button>
          {searchResults && (
            <p className={styles.searchMessage} role="status">
              검색 결과 {searchResults.length}건을 가져왔습니다.
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
