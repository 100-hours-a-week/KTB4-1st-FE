'use client'

// import axios from 'axios'
// import { uploadImagesToS3 } from '../../register/imageUpload'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import ItemRegisterForm from '@/components/items/ItemRegisterForm'
import type { ItemRegisterSubmitContext } from '@/components/items/ItemRegisterForm'
import { getMockItemDetail, mockItems, updateMockItem } from '@/data/mockItems'
import type { ItemRegisterFormValues, SelectedImage } from '@/types/item'
import styles from '../../register/page.module.css'

// const API_BASE_URL = 'http://127.0.0.1:8080'
// type ModerationResponse = {
//   data: {
//     isAppropriate: boolean
//     rejectionReason: string | null
//     checkId: string | null
//   }
// }

// 실제 API 연결 시 import와 함께 아래 함수의 주석을 해제합니다.
// async function updateItemFromApi(
//   itemId: number,
//   values: ItemRegisterFormValues,
//   { images, setImages }: ItemRegisterSubmitContext,
//   accessToken: string,
// ) {
//   const headers = {
//     Authorization: `Bearer ${accessToken}`,
//     'Content-Type': 'application/json',
//     Accept: 'application/json',
//   }
//
//   // 기존 objectKey는 재사용하고 새 사진만 업로드합니다.
//   const objectKeys = await uploadImagesToS3(images, setImages, accessToken)
//
//   // 등록할 때처럼 최종 제목과 내용을 검수합니다.
//   const response = await axios.post<ModerationResponse>(
//     `${API_BASE_URL}/moderation-checks`,
//     { title: values.title, content: values.content },
//     { headers },
//   )
//   const moderation = response.data.data
//   if (!moderation.isAppropriate) {
//     throw new Error(moderation.rejectionReason ?? '수정할 수 없는 내용입니다.')
//   }
//
//   // 검수를 통과한 경우에만 수정 요청을 보냅니다.
//   await axios.put(
//     `${API_BASE_URL}/items/${itemId}`,
//     {
//       title: values.title,
//       content: values.content,
//       quantity: values.quantity,
//       itemState: values.itemState,
//       exchangeUrgencyScore: Number((values.pace / 100).toFixed(2)),
//       valueGapToleranceScore: Number((values.condition / 100).toFixed(2)),
//       groupIds: values.groupIds,
//       objectKeys,
//     },
//     { headers },
//   )
// }

export default function ItemEditPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const router = useRouter()
  const [initialValues, setInitialValues] =
    useState<ItemRegisterFormValues | null>(null)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [initialImages, setInitialImages] = useState<SelectedImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    function loadItemForEdit() {
      if (!sessionStorage.getItem('accessToken')) {
        router.replace('/auth/login')
        return
      }

      const response = getMockItemDetail(Number(itemId))
      const mockItem = mockItems.find((item) => item.itemId === Number(itemId))

      if (!response || !mockItem) {
        setModalMessage('물품을 찾을 수 없습니다.')
        return
      }

      const item = response.data
      setInitialImages(
        item.images
          .toSorted((first, second) => first.displayOrder - second.displayOrder)
          .map((image, index) => ({
            id: String(image.imageId),
            imageId: image.imageId,
            preview: image.imageUrl,
            objectKey: mockItem.objectKeys[index],
          })),
      )
      setInitialValues({
        title: item.title,
        content: item.content,
        quantity: item.quantity,
        itemState: item.itemState,
        groupIds: item.groups.map((group) => group.groupId),
        pace: Math.round(mockItem.exchangeUrgencyScore * 100),
        condition: Math.round(mockItem.valueGapToleranceScore * 100),
      })
    }

    loadItemForEdit()
  }, [itemId, router])

  async function handleItemUpdate(
    values: ItemRegisterFormValues,
    context: ItemRegisterSubmitContext,
  ) {
    if (isSubmitting) return
    const accessToken = sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    setIsSubmitting(true)
    try {
      // 실제 API 연결 시 아래 호출을 사용하고 목업 수정은 제거합니다.
      // await updateItemFromApi(Number(itemId), values, context, accessToken)
      updateMockItem(Number(itemId), values, context.images)
      router.replace(`/pages/items/${itemId}`)
    } catch (error) {
      // if (axios.isAxiosError(error) && error.response?.status === 401) {
      //   sessionStorage.removeItem('accessToken')
      //   router.replace('/auth/login')
      //   return
      // }
      setModalMessage(
        error instanceof Error
          ? error.message
          : '물품 수정에 실패했습니다. 다시 시도해주세요.',
      )
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
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1>물건 수정</h1>
      </header>

      {initialValues && (
        <ItemRegisterForm
          key={itemId}
          initialValues={initialValues}
          initialImages={initialImages}
          isSubmitting={isSubmitting}
          requireChanges
          submitLabel="수정 완료"
          submittingLabel="수정 중..."
          onSubmit={handleItemUpdate}
          onValidationError={setModalMessage}
        />
      )}

      {modalMessage && (
        <ModalDefault
          message={modalMessage}
          onConfirm={() => setModalMessage(null)}
        />
      )}
    </section>
  )
}
