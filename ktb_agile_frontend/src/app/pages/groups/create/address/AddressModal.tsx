'use client'

import { useEffect, useState, type AnimationEvent, type FormEvent } from 'react'
import type { GroupAddressResponse, GroupAddressResult } from '@/types/group'
import styles from './address.module.css'

export default function AddressModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (address: GroupAddressResult) => void
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null)
  const [apiResult, setApiResult] = useState<GroupAddressResponse['results'] | null>(null)
  const [selectedAddress, setSelectedAddress] =useState<GroupAddressResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const results = apiResult ?? []

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const keyword = query.trim()
    if (!keyword) return

    setSelectedAddress(null)
    setSearchError(null)
    setSearchedQuery(keyword)
    setIsSearching(true)

    try {
      const data = await getAddress(keyword)
      setApiResult(data.results)
    } catch (error) {
      setApiResult([])
      setSearchError(
        error instanceof Error
          ? error.message
          : '주소 검색 중 오류가 발생했습니다.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (isClosing && event.target === event.currentTarget) {
      onClose()
    }
  }

  function handleSelect() {
    if (selectedAddress === null) return

    onSelect(selectedAddress)
    setIsClosing(true)
  }

  async function getAddress(keyword: string): Promise<GroupAddressResponse> {
    const response = await fetch(
      `/api/group?query=${encodeURIComponent(keyword)}`,
    )

    if (!response.ok) {
      const error = (await response.json()) as { message?: string }
      throw new Error(error.message ?? '주소 검색에 실패했습니다.')
    }

    return (await response.json()) as GroupAddressResponse
  }

  return (
    <div className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}>
      <div className={styles.sheetPosition}>
        <div className={`${styles.sheet} ${isClosing ? styles.sheetClosing : ''}`}
          onAnimationEnd={handleAnimationEnd}>
          <div className={styles.sheetHeader}>
            <h2>주소 검색</h2>
            <button className={styles.sheetCloseButton}
              type="button"
              onClick={() => setIsClosing(true)}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
                <path d="m9.5 9.5 5 5m0-5-5 5" />
              </svg>
            </button>
          </div>

          <form className={styles.addressSearchForm} onSubmit={handleSearch}>
            <div className={styles.addressSearchField}>
              <svg viewBox="0 0 24 24">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <input
                type="search"
                value={query}
                placeholder="도로명, 건물명, 지번 검색"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearchedQuery(null)
                  setSelectedAddress(null)
                  setSearchError(null)
                }}
              />
            </div>
            <button className={styles.addressSearchButton} type="submit">
              검색
            </button>
          </form>

          <div className={styles.addressResults}>
            {searchedQuery !== null && (
              <>
                {isSearching ? (
                  <p className={styles.emptyResults}>
                    주소를 검색하고 있습니다.
                  </p>
                ) : searchError !== null ? (
                  <p className={styles.emptyResults}>{searchError}</p>
                ) : (
                  <>
                    <p className={styles.resultCount}>
                      검색 결과 <span>{results.length}</span>건
                    </p>
                    {results.length > 0 ? (
                      <ul className={styles.resultList}>
                        {results.map((address, index) => {
                          const isSelected = selectedAddress === address
                          const roadAddress =
                            address.roadAddress ?? address.addressName

                          return (
                            <li
                              key={`${address.addressName}-${address.latitude}-${address.longitude}-${index}`}
                            >
                              <button
                                className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ''}`}
                                type="button"
                                onClick={() => setSelectedAddress(address)}
                              >
                                <span className={styles.roadAddress}>
                                  {roadAddress}
                                </span>
                                {address.roadAddress !== null && (
                                  <span className={styles.lotAddress}>
                                    <span className={styles.lotBadge}>
                                      지번
                                    </span>
                                    {address.addressName}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className={styles.selectedCheck}>
                                    ✓
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className={styles.emptyResults}>
                        검색 결과가 없습니다.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className={styles.sheetFooter}>
            <button
              className={styles.selectButton}
              type="button"
              disabled={selectedAddress === null}
              onClick={handleSelect}
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
