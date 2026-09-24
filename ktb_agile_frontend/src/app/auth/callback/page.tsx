'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://127.0.0.1:8080'
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
            `${API_BASE_URL}/auth/refresh`,
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
          throw new Error('Access token is missing from refresh response.')
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
          setErrorMessage('로그인 정보를 불러오지 못했습니다. 다시 로그인해주세요.')
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
