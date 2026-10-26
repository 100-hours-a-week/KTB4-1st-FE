'use client'

import axios from 'axios'
import '@/config/api'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import { setCurrentGroupId } from '@/utils/currentGroup'
import styles from './AccountCard.module.css'
import { redirectToLogin } from '@/utils/auth'

export default function AccountCard() {
  const router = useRouter()
  const [profile, setProfile] = useState<{
    nickname: string
    profileImageUrl: string | null
  } | null>(null)
  const [isProfileErrorOpen, setIsProfileErrorOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLogoutErrorOpen, setIsLogoutErrorOpen] = useState(false)
  const [isImageNoticeVisible, setIsImageNoticeVisible] = useState(true)
  const imageNoticeRef = useRef<HTMLParagraphElement>(null)
  const profileImageUrl = profile?.profileImageUrl?.trim()

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const accessToken = window.sessionStorage.getItem('accessToken')
        if (!accessToken) throw new Error('Access token is missing')

        const response = await axios.get('/bff/users/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        })

        const result = response.data
        if (
          typeof result.data?.nickname !== 'string' ||
          !result.data.nickname.trim()
        ) {
          throw new Error('Profile response is invalid')
        }

        if (active) setProfile(result.data)
      } catch {
        if (active) setIsProfileErrorOpen(true)
      }
    }

    void loadProfile()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!profile || profileImageUrl || !isImageNoticeVisible) return

    function dismissNotice(event: PointerEvent) {
      if (!imageNoticeRef.current?.contains(event.target as Node)) {
        setIsImageNoticeVisible(false)
      }
    }

    document.addEventListener('pointerdown', dismissNotice)
    return () => document.removeEventListener('pointerdown', dismissNotice)
  }, [profile, profileImageUrl, isImageNoticeVisible])

  function returnToLogin() {
    window.sessionStorage.removeItem('accessToken')
    setCurrentGroupId(0)
    redirectToLogin(router)
  }

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
        <div className={styles.avatarArea}>
          {profile && !profileImageUrl && (
            <p
              ref={imageNoticeRef}
              className={`${styles.imageNotice} ${!isImageNoticeVisible ? styles.imageNoticeHidden : ''}`}
            >
              로그인 시 &apos;선택&apos;을 누르지 않으면 사진이 안 보일 수
              있어요.
            </p>
          )}
          <div className={styles.avatar} aria-hidden="true">
            {profileImageUrl ? (
              <div
                className={styles.profileImage}
                style={{
                  backgroundImage: `url(${JSON.stringify(profileImageUrl)})`,
                }}
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.5 19c.5-3.5 2.7-5.2 6.5-5.2s6 1.7 6.5 5.2" />
              </svg>
            )}
          </div>
        </div>
        <div className={styles.details}>
          <strong className={styles.name}>
            {profile
              ? `안녕하세요 ${profile.nickname}님!`
              : '프로필을 불러오는 중...'}
          </strong>
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
      {isProfileErrorOpen && (
        <ModalDefault
          message="프로필 정보를 가져오는데 실패했습니다. 다시 로그인해주세요."
          confirmLabel="로그인"
          onConfirm={returnToLogin}
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
