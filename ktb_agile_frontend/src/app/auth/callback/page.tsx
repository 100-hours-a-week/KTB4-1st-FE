'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import Loading from '@/components/common/Loading'
import axios from 'axios'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './callback.module.css'

type RefreshResponse = {
  data: {
    accessToken: string
    tokenType: string
    expiresIn: number
  }
  error: null
}

export default function LoginCallback() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const completeLogin = async () => {
      try {
        const response = await axios.post<RefreshResponse>(
          '/bff/auth/accesstoken',
          undefined,
          {
            withCredentials: true,
            headers: { Accept: 'application/json' },
          },
        )

        if (!isActive) return

        const accessToken = response.data.data.accessToken

        if (!accessToken) {
          throw new Error(AUTH_ERRORS.ACCESS_TOKEN_MISSING)
        }

        window.sessionStorage.setItem('accessToken', accessToken)
        router.replace('/pages/items')
      } catch {
        if (isActive) {
          setErrorMessage(AUTH_ERRORS.LOGIN_INFO_LOAD_FAILED)
        }
      }
    }

    void completeLogin()

    return () => {
      isActive = false
    }
  }, [router])

  if (errorMessage !== null) {
    return (
      <section className={styles.errorPage} aria-live="assertive">
        <Image
          className={styles.errorImage}
          src="/fox_login_error.png"
          alt="로그인 정보를 불러오지 못했어요. 다시 로그인해주세요."
          width={1199}
          height={1312}
          sizes="(max-width: 227px) calc(100vw - 48px), 180px"
        />
        <button
          className={styles.returnButton}
          type="button"
          onClick={() => router.replace('/auth/login')}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 5-7 7 7 7M5 12h14" />
          </svg>
          로그인 페이지로 돌아가기
        </button>
      </section>
    )
  }

  return <Loading fullScreen />
}
