'use client'

import { useEffect, useState } from 'react'
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
  const [hasApplied, setHasApplied] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [checkError, setCheckError] = useState('')
  const [checkAttempt, setCheckAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function checkApplication() {
      const token = window.sessionStorage.getItem('accessToken')
      try {
        if (!token) throw new Error('로그인이 필요합니다.')
        const response = await axios.get<{ data: { applied: boolean } }>(
          '/bff/events/applications',
          {
            params: { chatRoomId, exchangeRequestId },
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        )
        if (typeof response.data.data?.applied !== 'boolean') {
          throw new Error('응모 여부를 확인하지 못했습니다.')
        }
        if (active) setHasApplied(response.data.data.applied)
      } catch (error) {
        if (!active) return
        setCheckError(
          axios.isAxiosError(error)
            ? (error.response?.data?.error?.message ??
                '응모 여부를 확인하지 못했습니다.')
            : error instanceof Error
              ? error.message
              : '응모 여부를 확인하지 못했습니다.',
        )
      } finally {
        if (active) setIsChecking(false)
      }
    }
    void checkApplication()
    return () => {
      active = false
      controller.abort()
    }
  }, [chatRoomId, exchangeRequestId, checkAttempt])

  async function apply(photo: File) {
    if (isSubmitting || isChecking || checkError || hasApplied) return
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
      await axios.post<{ data: { applicationId: number } }>(
        '/bff/events/applications',
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setHasApplied(true)
      setIsModalOpen(false)
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 409 &&
        error.response?.data?.error?.code === 'ALREADY_APPLIED'
      ) {
        setHasApplied(true)
        setIsModalOpen(false)
        return
      }
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

  if (hasApplied) return null

  return (
    <>
      <button
        className={styles.button}
        type="button"
        disabled={isChecking || !!checkError || isModalOpen || isSubmitting}
        onClick={() => {
          setError('')
          setIsModalOpen(true)
        }}
      >
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleLeft}`} />
        <span className={styles.label}>
          {isChecking ? '응모 여부 확인 중...' : '이벤트 응모하기'}
        </span>
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleRight}`} />
      </button>
      {checkError && (
        <div role="alert">
          <p>{checkError}</p>
          <button
            type="button"
            onClick={() => {
              setIsChecking(true)
              setCheckError('')
              setCheckAttempt((value) => value + 1)
            }}
          >
            다시 확인
          </button>
        </div>
      )}
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
