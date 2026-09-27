'use client'

import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import ItemRegisterForm from '@/components/items/ItemRegisterForm'
import type { ItemRegisterSubmitContext } from '@/components/items/ItemRegisterForm'
import { uploadImagesToS3 } from './imageUpload'
import type { ItemRegisterFormValues } from '../../../../types/item'
import styles from './page.module.css'

type ModerationResponse = {
  data: {
    isAppropriate: boolean
    rejectionReason: string | null
    checkId: string | null
  }
}

export default function ItemRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleItemSubmit(
    values: ItemRegisterFormValues,
    { images, setImages }: ItemRegisterSubmitContext,
  ) {
    if (isSubmitting) return
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    setIsSubmitting(true)

    try {
      // 이미 업로드한 사진은 다시 올리지 않고 objectKey만 가져옵니다.
      const objectKeys = await uploadImagesToS3(images, setImages, accessToken)

      // 사용자가 최종 확인한 제목과 내용을 먼저 검수합니다.
      const moderationResponse = await axios.post<ModerationResponse>(
        `${API_BASE_URL}/moderation-checks`,
        { title: values.title, content: values.content },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      const moderation = moderationResponse.data.data

      if (!moderation.isAppropriate) {
        setModalMessage(
          moderation.rejectionReason ?? '등록할 수 없는 내용입니다.',
        )
        return
      }
      if (!moderation.checkId) {
        throw new Error('검수 ID가 반환되지 않았습니다.')
      }

      // 검수를 통과한 경우에만 물품 등록을 요청합니다.
      await axios.post(
        `${API_BASE_URL}/items`,
        {
          title: values.title,
          content: values.content,
          moderationCheckId: moderation.checkId,
          quantity: values.quantity,
          itemState: values.itemState,
          exchangeUrgencyScore: Number((values.pace / 100).toFixed(2)),
          valueGapToleranceScore: Number((values.condition / 100).toFixed(2)),
          groupIds: values.groupIds,
          objectKeys,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )

      router.push('/pages/items')
    } catch (error) {
      console.error(error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.sessionStorage.removeItem('accessToken')
        router.replace('/auth/login')
        return
      }
      setModalMessage('물품 등록에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          type="button"
          onClick={() => router.back()}
        >
          {' '}
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1>물건 등록</h1>
      </header>

      <ItemRegisterForm
        isSubmitting={isSubmitting}
        onSubmit={handleItemSubmit}
        onValidationError={setModalMessage}
      />
      {modalMessage !== null && (
        <ModalDefault
          message={modalMessage}
          onConfirm={function closeModal() {
            setModalMessage(null)
          }}
        />
      )}
    </section>
  )
}
