'use client'

import { useState } from 'react'
import LogoutUnavailableModal from './LogoutUnavailableModal'
import styles from './AccountCard.module.css'

export default function AccountCard() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  function closeLogoutModal() {
    // TODO: 로그아웃 기능을 지원할 때 별도 API 호출과 토큰 삭제, 로그인 화면 이동을 연결합니다.
    setIsLogoutModalOpen(false)
  }

  return (
    <>
      <section className={styles.card}>
        <div className={styles.avatar} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5.5 19c.5-3.5 2.7-5.2 6.5-5.2s6 1.7 6.5 5.2" />
          </svg>
        </div>
        <div className={styles.details}>
          <strong className={styles.name}>안녕하세요 User님!</strong>
          <p className={styles.description}>오늘도 즐거운 하루 보내세요</p>
          <button
            className={styles.logout}
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
          >
            로그아웃
          </button>
        </div>
      </section>
      {isLogoutModalOpen && (
        <LogoutUnavailableModal onClose={closeLogoutModal} />
      )}
    </>
  )
}
