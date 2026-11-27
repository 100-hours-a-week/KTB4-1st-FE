'use client'

import { ITEM_ERRORS } from '@/constants/errors/item'
import { GROUP_ERRORS } from '@/constants/errors/group'
import { Suspense, useEffect, useState } from 'react'
import axios from 'axios'
import { apiClient } from '@/config/apiClient'
import { useQueryClient } from '@tanstack/react-query'
import { itemListKeys } from '@/queries/itemList'
import { API_BASE_URL } from '@/config/api'
import { useRouter, useSearchParams } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import ItemRegisterForm from '@/components/item/ItemRegisterForm'
import type { ItemRegisterSubmitContext } from '@/components/item/ItemRegisterForm'
import {
  uploadItemDetailThumbnails,
  uploadItemThumbnail,
} from '@/utils/itemThumbnail'
import { uploadImagesToS3 } from '@/utils/itemImageUpload'
import type { ItemRegisterFormValues } from '@/types/item'
import styles from './page.module.css'
import type { JoinedGroupOption } from '@/types/group'
import { getAccessTokenOrRedirect } from '@/utils/auth'

function ItemRegisterContent() {
  const [groups, setGroups] = useState<JoinedGroupOption[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const requestedGroupId = Number(searchParams.get('groupId'))

  useEffect(() => {
    const controller = new AbortController()
    async function loadGroups() {
      try {
        const response = await apiClient.get<{
          data: { groups: JoinedGroupOption[] }
        }>('/bff/me/groups', {
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        setGroups(response.data.data.groups)
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error(error)
          setModalMessage(GROUP_ERRORS.GROUP_LIST_LOAD_FAILED)
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false)
      }
    }
    void loadGroups()
    return () => controller.abort()
  }, [])

  async function handleItemSubmit(
    values: ItemRegisterFormValues,
    { images, setImages }: ItemRegisterSubmitContext,
  ) {
    if (isSubmitting) return
    if (!getAccessTokenOrRedirect(router)) return

    setIsSubmitting(true)

    try {
      // 이미 업로드한 사진은 다시 올리지 않고 objectKey만 가져옵니다.
      const objectKeys = await uploadImagesToS3(images, setImages)

      const thumbnailObjectKey = await uploadItemThumbnail(images[0], setImages)

      const imageDetailThumbnails = await uploadItemDetailThumbnails(
        images,
        objectKeys,
        setImages,
      )

      await apiClient.post(
        `${API_BASE_URL}/items`,
        {
          title: values.title,
          content: values.content,
          quantity: values.quantity,
          itemState: values.itemState,
          exchangeUrgencyScore: Number((values.pace / 100).toFixed(2)),
          valueGapToleranceScore: Number((values.condition / 100).toFixed(2)),
          groupIds: values.groupIds,
          objectKeys,
          thumbnailObjectKey,
          imageDetailThumbnails,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )

      void queryClient.invalidateQueries({ queryKey: itemListKeys.all })
      router.push('/pages/items')
    } catch (error) {
      console.error(error)
      setModalMessage(ITEM_ERRORS.REGISTER_FAILED)
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

      {isLoadingGroups ? (
        <p>그룹 목록을 불러오는 중입니다.</p>
      ) : groups.length > 0 ? (
        <ItemRegisterForm
          initialValues={{
            groupIds: groups.some((group) => group.groupId === requestedGroupId)
              ? [requestedGroupId]
              : [],
          }}
          groups={groups}
          isSubmitting={isSubmitting}
          onSubmit={handleItemSubmit}
          onValidationError={setModalMessage}
        />
      ) : (
        <p>
          가입한 그룹이 없습니다. <a href="/pages/groups">그룹 가입하기</a>
        </p>
      )}
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

export default function ItemRegister() {
  return (
    <Suspense fallback={<p>물품 등록 화면을 불러오는 중입니다.</p>}>
      <ItemRegisterContent />
    </Suspense>
  )
}
