'use client'

import { ITEM_ERRORS } from '@/constants/errors/item'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import ItemRegisterForm from '@/components/item/ItemRegisterForm'
import type { ItemRegisterSubmitContext } from '@/components/item/ItemRegisterForm'
import { API_BASE_URL } from '@/config/api'
import type { ItemDetailResponse, ItemRegisterFormValues, SelectedImage } from '@/types/item'
import type { JoinedGroupOption } from '@/types/group'
import styles from '../../register/page.module.css'

export default function ItemEditPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const router = useRouter()
  const [initialValues, setInitialValues] =
    useState<ItemRegisterFormValues | null>(null)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [initialImages, setInitialImages] = useState<SelectedImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groups, setGroups] = useState<JoinedGroupOption[]>([])

  useEffect(() => {
    let isMounted = true
    async function loadItemForEdit() {
      const accessToken = sessionStorage.getItem('accessToken')
      if (!accessToken) {
        router.replace('/auth/login')
        return
      }

      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        }
        const [itemResponse, groupResponse] = await Promise.all([
          axios.get<ItemDetailResponse>(`${API_BASE_URL}/items/${itemId}`, { headers }),
          axios.get<{ data: { groups: JoinedGroupOption[] } }>(
            `${API_BASE_URL}/users/me/groups?size=10&cursor=`,
            { headers },
          ),
        ])
        if (!isMounted) return
        const item = itemResponse.data.data
        setGroups(groupResponse.data.data.groups)
        setInitialImages(
          item.images
            .toSorted((first, second) => first.displayOrder - second.displayOrder)
            .map((image) => ({
              id: String(image.imageId),
              imageId: image.imageId,
              preview: image.imageUrl,
            })),
        )
        setInitialValues({
          title: item.title,
          content: item.content,
          quantity: item.quantity,
          itemState: item.itemState,
          groupIds: item.groups.map((group) => group.groupId),
          pace: Math.round(item.exchangeUrgencyScore * 100),
          condition: Math.round(item.valueGapToleranceScore * 100),
        })
      } catch (error) {
        if (!isMounted) return
        setModalMessage(
          axios.isAxiosError(error) && error.response?.status === 404
            ? ITEM_ERRORS.NOT_FOUND
            : ITEM_ERRORS.EDIT_LOAD_FAILED,
        )
      }
    }

    void loadItemForEdit()
    return () => {
      isMounted = false
    }
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
      const imageIds = context.images.map((image) => image.imageId)
      if (imageIds.some((imageId) => imageId === undefined)) {
        throw new Error(ITEM_ERRORS.NEW_IMAGE_ON_EDIT_UNSUPPORTED)
      }
      await axios.put(
        `${API_BASE_URL}/items/${itemId}`,
        {
          title: values.title,
          content: values.content,
          quantity: values.quantity,
          itemState: values.itemState,
          exchangeUrgencyScore: Number((values.pace / 100).toFixed(2)),
          valueGapToleranceScore: Number((values.condition / 100).toFixed(2)),
          groupIds: values.groupIds,
          imageIds,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      router.replace(`/pages/items/${itemId}`)
    } catch (error) {
      setModalMessage(
        error instanceof Error
          ? error.message
          : ITEM_ERRORS.UPDATE_FAILED,
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
          groups={groups}
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
