'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import Image from 'next/image'
import styles from './login.module.css'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'

const CONTACT_EMAIL = 'founder@bakkucca.com'

const USAGE_STEPS = [
  {
    title: '그룹 참여하기',
    description: '내 동네나 관심사가 맞는 그룹을 찾아 참여해요.',
  },
  {
    title: '물건 등록하기',
    description: '쓰지 않는 물건의 사진과 설명을 올려요.',
  },
  {
    title: '교환 요청하기',
    description: '그룹에서 마음에 드는 물건을 찾아 채팅으로 교환을 제안해요.',
  },
  {
    title: '만나서 교환하기',
    description: '약속을 잡고 만나 서로의 물건을 바꿔요.',
  },
]

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
        <p className={styles.tagline}>쓰지 않는 물건을, 필요한 물건으로</p>
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

        <section
          className={`${styles.introSection} ${styles.introDivided}`}
          aria-labelledby="intro-title"
        >
          <h2 id="intro-title" className={styles.sectionTitle}>
            바꾸까는 어떤 서비스인가요?
          </h2>
          <p className={styles.introText}>
            바꾸까는 같은 지역이나 관심사로 모인 그룹에서 물건을 교환하는
            서비스입니다.
          </p>
        </section>

        <section className={styles.introSection} aria-labelledby="howto-title">
          <h2 id="howto-title" className={styles.sectionTitle}>
            이용 방법
          </h2>
          <ol className={styles.stepList}>
            {USAGE_STEPS.map((step, index) => (
              <li key={step.title} className={styles.stepItem}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerLabel}>문의</p>
          <a className={styles.footerLink} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          <p className={styles.copyright}>© 바꾸까</p>
        </footer>
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
