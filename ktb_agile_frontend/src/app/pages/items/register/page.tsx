'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import ModalDefault from '@/components/common/modal/Default'
import ImageRegister from './components/ImageRegister'
import ItemInfoRegister from './components/ItemInfoRegister'
import { uploadImagesToS3 } from './imageUpload'
import type {
  ItemRegisterFormValues,
  SelectedImage,
} from '../../../../types/item'
import styles from './page.module.css'

const API_BASE_URL = 'http://127.0.0.1:8080'

type ModerationResponse = {
  data: {
    isAppropriate: boolean
    rejectionReason: string | null
    checkId: string | null
  }
}

export default function ItemRegister() {
  const [images, setImages] = useState<SelectedImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImageRejected, setIsImageRejected] = useState(false)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const router = useRouter()

  const methods = useForm<ItemRegisterFormValues>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      content: '',
      itemState: 'AVAILABLE',
      quantity: undefined,
      groupIds: [1],
      pace: 55,
      condition: 28,
    },
  })

  async function handleItemSubmit(values: ItemRegisterFormValues) {
    if (isSubmitting || isAnalyzing || isImageRejected) return
    if (images.length === 0 || values.quantity === undefined) {
      setModalMessage('사진과 필수 정보를 입력해주세요.')
      return
    }

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
        <button className={styles.backButton} type="button">
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1>물건 등록</h1>
      </header>

      <FormProvider {...methods}>
        <form
          className={styles.form}
          onSubmit={methods.handleSubmit(handleItemSubmit)}
        >
          <ImageRegister
            images={images}
            setImages={setImages}
            isSubmitting={isSubmitting}
            onAnalysisStateChange={setIsAnalyzing}
            onRejectionChange={setIsImageRejected}
          />
          <ItemInfoRegister />

          <div className={styles.submitBar}>
            <button
              type="submit"
              disabled={
                !methods.formState.isValid ||
                images.length === 0 ||
                isSubmitting ||
                isAnalyzing ||
                isImageRejected
              }
            >
              {isSubmitting ? '등록 중...' : '등록 완료'}
            </button>
          </div>
        </form>
      </FormProvider>
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
