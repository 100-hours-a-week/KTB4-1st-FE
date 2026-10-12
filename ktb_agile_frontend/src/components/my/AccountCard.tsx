'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import styles from './AccountCard.module.css'

export default function AccountCard() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLogoutErrorOpen, setIsLogoutErrorOpen] = useState(false)

  async function logout() {
    if (isLoggingOut) return

    setIsLogoutConfirmOpen(false)
    setIsLoggingOut(true)
    try {
      const accessToken = window.sessionStorage.getItem('accessToken')
      if (!accessToken) throw new Error('재로그인이 필요합니니다.')

      const response = await axios.post('/bff/auth/logout', undefined, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      if (response.status !== 204) throw new Error('로그아웃에 실패했습니다.')

      window.sessionStorage.removeItem('accessToken')
      router.replace('/')
    } catch {
      setIsLogoutErrorOpen(true)
    } finally {
      setIsLoggingOut(false)
    }
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
            onClick={() => setIsLogoutConfirmOpen(true)}
            disabled={isLoggingOut}
          >
            로그아웃
          </button>
        </div>
      </section>
      {isLogoutConfirmOpen && (
        <ModalDefault
          message="정말 로그아웃하시겠습니까?"
          onConfirm={logout}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
      )}
      {isLogoutErrorOpen && (
        <ModalDefault
          message="로그아웃에 실패했습니다. 조금 후에 다시 시도해주세요"
          onConfirm={() => setIsLogoutErrorOpen(false)}
        />
      )}
    </>
  )
}
