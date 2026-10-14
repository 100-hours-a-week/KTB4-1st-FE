'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import type { ItemListItem, MyItemListItem } from '@/types/item'
import type {
  SmartSearchRequest,
  SmartSearchResponse,
} from '@/types/smartSearch'
import SmartSearchMyItems from './SmartSearchMyItems'
import styles from './AiSmartSearchPage.module.css'

export default function AiSmartSearchPage() {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<MyItemListItem[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [preferenceText, setPreferenceText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<ItemListItem[] | null>(
    null,
  )

  const commonGroups = selectedItems.length
    ? selectedItems[0].groups.filter((group) =>
        selectedItems.every((item) =>
          item.groups.some((itemGroup) => itemGroup.groupId === group.groupId),
        ),
      )
    : []
  const groupId = commonGroups.some(
    (group) => group.groupId === selectedGroupId,
  )
    ? selectedGroupId
    : commonGroups[0]?.groupId

  async function search() {
    if (isSearching || selectedItems.length === 0 || !groupId) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResults(null)

    const request: SmartSearchRequest = {
      groupId,
      items: selectedItems.map((item) => ({
        itemId: item.itemId,
        quantity: 1,
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

        <section className={styles.itemsSection}>
          <h2>내 물건 목록</h2>
          <SmartSearchMyItems
            onSelectionChange={(items) => {
              setSelectedItems(items)
              setSearchResults(null)
              setSearchError(null)
            }}
          />
          {selectedItems.length > 0 && (
            <p className={styles.quantityNote}>
              선택한 물품은 각각 1개 기준으로 검색합니다.
            </p>
          )}
          {commonGroups.length > 1 && (
            <label className={styles.groupField}>
              검색할 그룹
              <select
                value={groupId ?? ''}
                onChange={(event) => {
                  setSelectedGroupId(Number(event.target.value))
                  setSearchResults(null)
                  setSearchError(null)
                }}
              >
                {commonGroups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedItems.length > 0 && commonGroups.length === 0 && (
            <p className={styles.searchMessage} role="alert">
              선택한 물품들이 속한 공통 그룹이 없습니다.
            </p>
          )}
        </section>

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
