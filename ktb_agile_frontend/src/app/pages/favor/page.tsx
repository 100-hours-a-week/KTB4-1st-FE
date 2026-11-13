'use client'

import { PREFERENCE_ERRORS } from '@/constants/errors/preference'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import PreferenceForm from '@/components/preference/PreferenceForm'
import type { PreferenceAnswer } from '@/types/preference'
import axios from 'axios'
import { getAccessTokenOrRedirect } from '@/utils/auth'
import '@/config/api'

function isPreferenceNotFound(error: unknown) {
  return (
    axios.isAxiosError<{ error?: { code?: string } | null }>(error) &&
    error.response?.status === 404 &&
    error.response.data?.error?.code === 'USER_PREFERENCE_NOT_FOUND'
  )
}

export default function PreferenceSetup() {
  const router = useRouter()
  const [preferenceStatus, setPreferenceStatus] = useState<
    'checking' | 'available' | 'failed'
  >('checking')
  const [initialAnswers, setInitialAnswers] = useState<PreferenceAnswer[]>([])
  const isEditMode = initialAnswers.length > 0

  useEffect(() => {
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    const controller = new AbortController()
    async function checkPreferences() {
      try {
        const response = await axios.get<{
          data: { answers: PreferenceAnswer[] } | null
          error?: { message: string } | null
        } | null>('/bff/preferences', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        if (response.data?.error) {
          throw new Error(response.data.error.message)
        }
        if (!controller.signal.aborted) {
          setInitialAnswers(response.data?.data?.answers ?? [])
          setPreferenceStatus('available')
        }
      } catch (error) {
        if (controller.signal.aborted) return
        // 취향을 아직 저장하지 않은 사용자는 백엔드가 404로 알려줍니다.
        if (isPreferenceNotFound(error)) {
          setInitialAnswers([])
          setPreferenceStatus('available')
          return
        }
        setPreferenceStatus('failed')
      }
    }

    void checkPreferences()
    return () => controller.abort()
  }, [router])

  async function savePreferences(answers: PreferenceAnswer[]) {
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) throw new Error('로그인이 필요합니다.')

    const save = isEditMode ? axios.put : axios.post
    await save(
      '/bff/preferences',
      { answers },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )
    router.replace(isEditMode ? '/pages/my' : '/pages/items')
  }

  if (preferenceStatus === 'available') {
    return (
      <PreferenceForm
        initialAnswers={initialAnswers}
        title={isEditMode ? '거래 취향 수정' : '거래 취향 설정'}
        submitLabel={isEditMode ? '저장' : '완료'}
        failureMessage={PREFERENCE_ERRORS.SAVE_FAILED}
        onSubmit={savePreferences}
      />
    )
  }

  return (
    <>
      <section>
        {preferenceStatus === 'checking' && (
          <p role="status">거래 취향을 불러오는 중입니다.</p>
        )}
      </section>
      {preferenceStatus === 'failed' && (
        <ModalDefault
          message="취향 설문을 확인하지 못했습니다. 다시 접속해주세요."
          onConfirm={() => router.replace('/pages/items')}
        />
      )}
    </>
  )
}
