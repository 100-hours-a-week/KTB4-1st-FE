'use client'

import { useState } from 'react'
import axios from 'axios'
import SparkleIcon from '@/components/common/chatbot/SparkleIcon'
import EventApplyModal from './EventApplyModal'
import styles from './EventApplyButton.module.css'

type EventApplyButtonProps = {
  chatRoomId: number
  exchangeRequestId: number
  isSeller: boolean
  otherUser: string
  requestedItemTitle: string
  offeredItemTitles: string
}

export default function EventApplyButton({
  chatRoomId,
  exchangeRequestId,
  isSeller,
  otherUser,
  requestedItemTitle,
  offeredItemTitles,
}: EventApplyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [applicationId, setApplicationId] = useState<number | null>(null)

  async function apply(photo: File) {
    if (isSubmitting) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      setError('로그인이 필요합니다.')
      return
    }
    setIsSubmitting(true)
    setError('')
    const form = new FormData()
    form.set('chatRoomId', String(chatRoomId))
    form.set('exchangeRequestId', String(exchangeRequestId))
    form.set('photo', photo)
    try {
      const response = await axios.post<{ data: { applicationId: number } }>(
        '/bff/events/applications',
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setApplicationId(response.data.data.applicationId)
      setIsModalOpen(false)
    } catch (error) {
      setError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error?.message ??
              '응모를 저장하지 못했습니다. 다시 시도해주세요.')
          : '응모를 저장하지 못했습니다. 다시 시도해주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        className={styles.button}
        type="button"
        disabled={applicationId !== null}
        onClick={() => {
          setError('')
          setIsModalOpen(true)
        }}
      >
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleLeft}`} />
        <span className={styles.label}>
          {applicationId === null
            ? '이벤트 응모하기'
            : `응모 완료 (ID: ${applicationId})`}
        </span>
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleRight}`} />
      </button>
      {isModalOpen && (
        <EventApplyModal
          isSeller={isSeller}
          otherUser={otherUser}
          requestedItemTitle={requestedItemTitle}
          offeredItemTitles={offeredItemTitles}
          isSubmitting={isSubmitting}
          error={error}
          onApply={(photo) => void apply(photo)}
          onClose={() => {
            if (!isSubmitting) setIsModalOpen(false)
          }}
        />
      )}
    </>
  )
}
