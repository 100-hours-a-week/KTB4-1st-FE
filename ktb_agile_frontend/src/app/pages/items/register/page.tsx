'use client'

import { Suspense, useEffect, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { useRouter, useSearchParams } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import ItemRegisterForm from '@/components/items/ItemRegisterForm'
import type { ItemRegisterSubmitContext } from '@/components/items/ItemRegisterForm'
import { uploadImagesToS3 } from './imageUpload'
import type { ItemRegisterFormValues } from '../../../../types/item'
import styles from './page.module.css'
import type { JoinedGroupOption } from '@/types/group'

type ModerationResponse = {
  data: {
    isAppropriate: boolean
    rejectionReason: string | null
    checkId: string | null
  }
}

function ItemRegisterContent() {
  const [groups, setGroups] = useState<JoinedGroupOption[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedGroupId = Number(searchParams.get('groupId'))

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    const controller = new AbortController()
    async function loadGroups() {
      try {
        const response = await axios.get<{
          data: { groups: JoinedGroupOption[] }
        }>(
          `${API_BASE_URL}/users/me/groups?size=10&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )
        setGroups(response.data.data.groups)
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error(error)
          setModalMessage('그룹 목록을 불러오지 못했습니다. 다시 시도해주세요.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false)
      }
    }
    void loadGroups()
    return () => controller.abort()
  }, [router])

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
