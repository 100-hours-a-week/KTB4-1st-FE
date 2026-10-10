'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './AiSmartSearchResult.module.css'

export default function AiSmartSearchResult() {
  const router = useRouter()

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
          <Link href="/pages/search/ai-smart-search">수정하기</Link>
        </div>
        <h3>선택한 내 물품</h3>
        <p className={styles.muted}>선택한 물품이 없습니다.</p>
        <h3>교환을 희망하는 조건</h3>
        <p className={styles.conditionText}>입력한 조건이 없습니다.</p>
      </section>

      <section className={styles.results}>
        <div className={styles.sectionHeading}>
          <h2>검색 결과</h2>
        </div>
        <div className={styles.emptyResult}>
          <span className={styles.resultIcon}>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </span>
          <strong>아직 검색 결과가 없습니다</strong>
          <p>스마트 검색 결과가 준비되면 이곳에 물품이 표시됩니다.</p>
        </div>
      </section>
      <Navbar />
    </main>
  )
}
