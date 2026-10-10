'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './AiSmartSearchPage.module.css'

export default function AiSmartSearchPage() {
  const router = useRouter()

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
          <p className={styles.message}>내가 등록한 물품이 없습니다.</p>
        </section>

        <section className={styles.conditionSection}>
          <h2>교환을 희망하는 조건</h2>
          <textarea placeholder="예) 과자 물 칫솔 등과 바꾸고 싶어" />
        </section>

        <div className={styles.actionArea}>
          <Link
            href="/pages/search/ai-smart-search/result"
            className={styles.searchButton}
          >
            검색하기
          </Link>
        </div>
      </div>
    </main>
  )
}
