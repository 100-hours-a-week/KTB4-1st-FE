'use client'

import Image from 'next/image'
import styles from './login.module.css'
import axios from 'axios'
import { useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'

export default function Login() {
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const LOGIN_ERROR_STATUSES = new Set([400, 401, 409, 500])

  async function loginProcess() {
    //이미 로그인 된 상태일 시
    if(isLoggingIn){
      return
    }

    setIsLoggingIn(true)

    try {
      //로그인 요청 API 호출
      const response = await axios.post(
        'http://localhost:8080/api/auth/oauth', 
        {
          'provider': 'kakao'
        }, 
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      //로그인 성공 처리 로직
      console.log(response.data)
      

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        //로그인 관련 에러
        if (status !== undefined && LOGIN_ERROR_STATUSES.has(status)) {
          setModalMessage(
            '로그인에 오류가 발생했습니다.\n다시 시도해주세요.',
          )
          return
        }
      }

      // CORS 또는 네트워크 오류처럼 HTTP 상태가 없는 경우
      setModalMessage(
        '서버에 연결할 수 없습니다.\n잠시 후 다시 시도해주세요.',
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
