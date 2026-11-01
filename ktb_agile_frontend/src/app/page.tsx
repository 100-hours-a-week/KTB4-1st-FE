'use client'

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
        <h1 className={styles.logoTitle} aria-label="바꾸까">
          <Image
            className={styles.landingImage}
            src="/images/winter/winter-main-transparent.png"
            alt="눈 위에서 겨울 모자와 목도리를 두른 여우와 두루미, 바꾸까"
            width={1677}
            height={941}
            sizes="(max-width: 679px) 100vw, (max-width: 1023px) 600px, 480px"
            preload
          />
        </h1>
        <div className={styles.loginArea}>
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
