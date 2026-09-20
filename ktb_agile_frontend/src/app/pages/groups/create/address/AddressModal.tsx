'use client'

import { useEffect, useState, type AnimationEvent, type FormEvent } from 'react'
import styles from './address.module.css'

const sampleAddresses = [
  {
    postalCode: '06236',
    road: '서울특별시 강남구 테헤란로 123',
    lot: '서울특별시 강남구 역삼동 735-1',
  },
  {
    postalCode: '06224',
    road: '서울특별시 강남구 테헤란로 152',
    lot: '서울특별시 강남구 역삼동 736-1',
  },
  {
    postalCode: '06221',
    road: '서울특별시 강남구 테헤란로 218',
    lot: '서울특별시 강남구 역삼동 719-2',
  },
  {
    postalCode: '06211',
    road: '서울특별시 강남구 테헤란로 302',
    lot: '서울특별시 강남구 역삼동 707-1',
  },
  {
    postalCode: '06141',
    road: '서울특별시 강남구 테헤란로 312',
    lot: '서울특별시 강남구 역삼동 707-2',
  },
  {
    postalCode: '06142',
    road: '서울특별시 강남구 테헤란로 345',
    lot: '서울특별시 강남구 역삼동 708-1',
  },
]

type Address = (typeof sampleAddresses)[number]

export default function AddressModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (address: Address) => void
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null)
  const [selectedPostalCode, setSelectedPostalCode] = useState<string | null>(
    null,
  )
  const results =
    searchedQuery === null
      ? []
      : sampleAddresses.filter((address) =>
          [address.postalCode, address.road, address.lot].some((value) =>
            value.includes(searchedQuery),
          ),
        )
  const selectedAddress =
    results.find((address) => address.postalCode === selectedPostalCode) ?? null

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSelectedPostalCode(null)
    setSearchedQuery(query.trim() || null)
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

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
    >
      <div className={styles.sheetPosition}>
        <div
          className={`${styles.sheet} ${isClosing ? styles.sheetClosing : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className={styles.sheetHeader}>
            <h2>주소 검색</h2>
            <button
              className={styles.sheetCloseButton}
              type="button"
              onClick={() => setIsClosing(true)}
            >
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
                  setSelectedPostalCode(null)
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
                <p className={styles.resultCount}>
                  검색 결과 <span>{results.length}</span>건
                </p>
                {results.length > 0 ? (
                  <ul className={styles.resultList}>
                    {results.map((address) => {
                      const isSelected =
                        selectedPostalCode === address.postalCode

                      return (
                        <li key={address.postalCode}>
                          <button
                            className={`${styles.resultItem} ${isSelected ? styles.resultItemSelected : ''}`}
                            type="button"
                            onClick={() =>
                              setSelectedPostalCode(address.postalCode)
                            }
                          >
                            <span className={styles.postalCode}>
                              {address.postalCode}
                            </span>
                            <span className={styles.roadAddress}>
                              {address.road}
                            </span>
                            <span className={styles.lotAddress}>
                              <span className={styles.lotBadge}>지번</span>
                              {address.lot}
                            </span>
                            {isSelected && (
                              <span className={styles.selectedCheck}>✓</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className={styles.emptyResults}>검색 결과가 없습니다.</p>
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
