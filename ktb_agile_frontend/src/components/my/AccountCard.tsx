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
        <div className={styles.avatar} />
        <div className={styles.details}>
          <div className={styles.heading}>
            <strong className={styles.name}>카카오 계정</strong>
            <button
              className={styles.logout}
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              로그아웃
            </button>
          </div>
          <p className={styles.description}>마이페이지에서 내 정보를 관리하세요.</p>
        </div>
      </section>
      {isLogoutModalOpen && (
        <LogoutUnavailableModal onClose={closeLogoutModal} />
      )}
    </>
  )
}
