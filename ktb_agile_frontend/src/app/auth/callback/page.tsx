'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const MINIMUM_LOADING_TIME_MS = 3_000

type RefreshResponse = {
  data: {
    accessToken: string
    tokenType: string
    expiresIn: number
    needsPreferenceSetup:boolean
  }
  error: null
}

export default function LoginCallback() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const completeLogin = async () => {
      const waitForLoading = new Promise<void>((resolve) => {
        window.setTimeout(resolve, MINIMUM_LOADING_TIME_MS)
      })

      try {
        const [response] = await Promise.all([
          axios.post<RefreshResponse>(
            '/bff/auth/accesstoken',
            undefined,
            {
              withCredentials: true,
              headers: { Accept: 'application/json' },
            },
          ),
          waitForLoading,
        ])

        const accessToken = response.data.data.accessToken

        if (!accessToken) {
          throw new Error(AUTH_ERRORS.ACCESS_TOKEN_MISSING)
        }

        window.sessionStorage.setItem('accessToken', accessToken)
       
        const needsPreferenceSetup = response.data.data.needsPreferenceSetup;

        if (isActive) {
          if(needsPreferenceSetup){ 
            router.replace('/pages/favor')
            return
          }
          router.replace('/pages/items')
        }
      } catch {
        await waitForLoading

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

  return (
    <section aria-live="polite" role="status">
      <p>로그인 처리 중...</p>
    </section>
  )
}
