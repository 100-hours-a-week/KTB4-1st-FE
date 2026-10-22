'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
      <section aria-live="assertive">
        <p>{errorMessage}</p>
        <button type="button" onClick={() => router.replace('/auth/login')}>
          로그인 페이지로 돌아가기
        </button>
      </section>
    )
  }

  return null
}
