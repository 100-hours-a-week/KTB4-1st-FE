'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ItemCardList from '@/components/item/ItemCardList'
import { useSmartSearch } from './SmartSearchProvider'
import styles from './AiSmartSearchResult.module.css'

const SEARCH_PATH = '/pages/search/ai-smart-search'

export default function AiSmartSearchResult() {
  const router = useRouter()
  const { items, preferenceText, results } = useSmartSearch()
  const selectedQuantity = items.reduce((sum, { quantity }) => sum + quantity, 0)

  // 새로고침 등으로 검색 결과가 사라졌다면 검색 화면으로 돌려보냅니다.
  useEffect(() => {
    if (results === null) router.replace(SEARCH_PATH)
  }, [results, router])

  if (results === null) return null

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.back()}
          >
            &lt;
          </button>
          <h1>스마트 검색 결과</h1>
        </div>
      </header>

      <section className={styles.conditions}>
        <div className={styles.sectionHeading}>
          <h2>검색 조건</h2>
          <Link href={SEARCH_PATH}>수정하기</Link>
        </div>
        <h3>선택한 내 물품</h3>
        <p className={styles.muted}>
          {items.length > 0
            ? `${items.length}종 · 총 ${selectedQuantity}개`
            : '선택한 물품이 없습니다.'}
        </p>
        <h3>교환을 희망하는 조건</h3>
        <p className={styles.conditionText}>
          {preferenceText.trim() || '입력한 조건이 없습니다.'}
        </p>
      </section>

      <section className={styles.results}>
        <div className={styles.sectionHeading}>
          <h2>검색 결과</h2>
        </div>
        {results.length > 0 ? (
          <ItemCardList className={styles.resultList} items={results} />
        ) : (
          <div className={styles.emptyResult}>
            <span className={styles.resultIcon}>
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
            </span>
            <strong>검색 결과가 없습니다</strong>
            <p>조건에 맞는 물품을 찾지 못했어요. 조건을 바꿔 다시 검색해 보세요.</p>
          </div>
        )}
      </section>
      <Navbar />
    </main>
  )
}
