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
    if(isLoggingIn){
      return
    }

    setIsLoggingIn(true)

    try {
      //카카오 state 요청 로직
      const stateResponse = await axios.get(`${API_BASE_URL}/auth/oauth/state`,
        {
        withCredentials: true,
        headers: {
          Accept: 'application/json',
        },
      },
      );

      //카카오 state 값 추출 
      const state = stateResponse.data.data.state

      //카카오 소셜 로그인 리다이렉팅 - 환경변수 공개되어 있기 때문에 코드 수정 필요
      window.location.assign(`https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code&state=${state}`)
      
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        //로그인 관련 에러
        if (status !== undefined) {
          setModalMessage(
            AUTH_ERRORS.LOGIN_FAILED,
          )
          return
        }
      }

      // CORS 또는 네트워크 오류처럼 HTTP 상태가 없는 경우
      setModalMessage(
        AUTH_ERRORS.SERVER_UNAVAILABLE,
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <>
      <section className={styles.loginPage}>
        <h1 className={styles.title}>로그인</h1>
        <button
          className={styles.kakaoLoginButton}
          type="button"
          onClick={loginProcess}
          disabled={isLoggingIn}
          aria-label="카카오 로그인"
        >
          <Image
            className={styles.kakaoLoginImage}
            src="/kakao_login_large_wide.png"
            alt="kakao-login-btn"
            width={600}
            height={90}
          />
        </button>
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
