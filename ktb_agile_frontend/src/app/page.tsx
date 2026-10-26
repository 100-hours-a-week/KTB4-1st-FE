'use client'

import HalloweenDecoration from '@/components/common/seasonal/HalloweenDecoration'
import { AUTH_ERRORS } from '@/constants/errors/auth'
import Image from 'next/image'
import styles from './login.module.css'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'

export default function Login() {
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function loginProcess() {
    //이미 로그인 된 상태일 시
    if (isLoggingIn) {
      return
    }

    setIsLoggingIn(true)

    try {
      //카카오 state 요청 로직
      const stateResponse = await axios.get(
        `${API_BASE_URL}/auth/oauth/state`,
        {
          withCredentials: true,
          headers: {
            Accept: 'application/json',
          },
        },
      )

      //카카오 state 값 추출
      const state = stateResponse.data.data.state

      //카카오 소셜 로그인 리다이렉팅 - 환경변수 공개되어 있기 때문에 코드 수정 필요
      window.location.assign(
        `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code&state=${state}`,
      )
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        //로그인 관련 에러
        if (status !== undefined) {
          setModalMessage(AUTH_ERRORS.LOGIN_FAILED)
          return
        }
      }

      // CORS 또는 네트워크 오류처럼 HTTP 상태가 없는 경우
      setModalMessage(AUTH_ERRORS.SERVER_UNAVAILABLE)
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <>
      <section className={styles.loginPage}>
        <div className={styles.web} aria-hidden="true">
          <svg viewBox="0 0 160 160" fill="none">
            <path
              d="M0 0L160 16M0 0L146 72M0 0L112 112M0 0L72 146M0 0L16 160M42 4Q34 29 4 42M82 8Q74 34 68 34Q62 61 34 68Q27 77 8 82M122 12Q114 47 100 50Q94 92 50 100Q43 117 12 122M158 16Q151 63 132 66Q124 121 66 132Q58 153 16 158"
              stroke="currentColor"
            />
          </svg>
        </div>
        <span className={styles.seasonLabel}>
          THE HALLOWEEN EDITION · 10.26 - 10.31
        </span>
        <h1 className={styles.logoTitle}>바꾸까</h1>
        <span className={styles.titleAccent} aria-hidden="true">
          TRICK OR TRADE!
        </span>
        <div className={styles.loginArea}>
          <div className={styles.characters} aria-hidden="true">
            <HalloweenDecoration kind="candy" className={styles.sceneCandy} />
            <span className={styles.moon} />
            <span className={`${styles.star} ${styles.starOne}`}>✦</span>
            <span className={`${styles.star} ${styles.starTwo}`}>✧</span>
            <span className={`${styles.star} ${styles.starThree}`}>✦</span>
            <span className={styles.orbit} />
            <Image
              className={`${styles.character} ${styles.fox}`}
              src="/images/halloween/halloween-fox.png"
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 679px) 48vw, 240px"
              preload
            />
            <Image
              className={`${styles.character} ${styles.crane}`}
              src="/images/halloween/halloween-crane.png"
              alt=""
              width={1254}
              height={1254}
              sizes="(max-width: 679px) 48vw, 240px"
              preload
            />
            <span className={styles.pumpkin}>
              <i />
              <b />
            </span>
          </div>
          <button
            className={styles.kakaoLoginButton}
            type="button"
            onClick={loginProcess}
            disabled={isLoggingIn}
            aria-label="카카오 로그인"
          >
            <svg
              className={styles.loginSymbol}
              viewBox="0 0 24 24"
              width={24}
              height={24}
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 3C5.373 3 0 6.806 0 11.5c0 3.016 2.218 5.665 5.564 7.17l-1.13 4.218a.35.35 0 0 0 .536.39l4.95-3.28c.677.068 1.371.102 2.08.102 6.627 0 12-3.806 12-8.5S18.627 3 12 3Z" />
            </svg>
            <span className={styles.loginLabel}>카카오 로그인</span>
          </button>
        </div>
      </section>

      {modalMessage !== null && (
        <ModalDefault
          message={modalMessage}
          onConfirm={() => setModalMessage(null)}
        />
      )}
    </>
  )
}
