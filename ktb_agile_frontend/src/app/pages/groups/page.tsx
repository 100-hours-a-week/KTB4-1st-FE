'use client'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'

export default function GroupList() {
    const router = useRouter()

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={()=>router.back()}>
            {/* 뒤로가기 아이콘 */}
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1 className={styles.title}>그룹</h1>
        <button className={styles.createButton} type="button" onClick={()=>router.push('/pages/groups/create')}>
          그룹 생성하기
        </button>
      </header>

      <div className={styles.search}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="그룹명을 검색"
        />
        <button className={styles.searchButton} type="button">
          그룹검색
        </button>
      </div>

      <Navbar />
    </section>
  )
}
