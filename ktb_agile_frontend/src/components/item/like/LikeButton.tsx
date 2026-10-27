'use client'

import axios from 'axios'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { itemListKeys } from '@/queries/itemList'
import ModalDefault from '@/components/common/modal/Default'
import styles from './LikeButton.module.css'

type LikeButtonProps = {
  itemId: number
  isLiked: boolean
  initialLikeCount: number
  placement?: 'card' | 'title'
}

export default function LikeButton({
  itemId,
  isLiked,
  initialLikeCount,
  placement = 'card',
}: LikeButtonProps) {
  const queryClient = useQueryClient()
  const [serverValue, setServerValue] = useState({
    itemId,
    isLiked,
    initialLikeCount,
  })
  const [liked, setLiked] = useState(isLiked)
  const [count, setCount] = useState(initialLikeCount)
  const [isPending, setIsPending] = useState(false)
  const [hasRequestError, setHasRequestError] = useState(false)

  // 서버 props가 바뀌면 낙관적 상태도 새 기준으로 맞춥니다.
  if (
    serverValue.itemId !== itemId ||
    serverValue.isLiked !== isLiked ||
    serverValue.initialLikeCount !== initialLikeCount
  ) {
    setServerValue({ itemId, isLiked, initialLikeCount })
    setLiked(isLiked)
    setCount(initialLikeCount)
  }

  async function toggleLike() {
    if (isPending) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      window.dispatchEvent(new Event('auth-expired'))
      return
    }

    const nextLiked = !liked
    const previousCount = count
    setLiked(nextLiked)
    setCount((currentCount) => Math.max(0, currentCount + (nextLiked ? 1 : -1)))
    setIsPending(true)

    try {
      if (nextLiked) {
        const response = await axios.post(`/bff/like/${itemId}`, undefined, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const serverLikeCount = response.data?.data?.likeCount
        if (typeof serverLikeCount === 'number') {
          setCount(serverLikeCount)
        }
      } else {
        await axios.delete(`/bff/like/${itemId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
      void queryClient.invalidateQueries({ queryKey: itemListKeys.all })
    } catch {
      setLiked(!nextLiked)
      setCount(previousCount)
      setHasRequestError(true)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <button
        className={`${styles.button}${liked ? ` ${styles.liked}` : ''}${
          placement === 'title' ? ` ${styles.titlePlacement}` : ''
        }`}
        onClick={toggleLike}
        disabled={isPending}
        type="button"
        aria-label={liked ? '좋아요 취소' : '좋아요'}
        aria-pressed={liked}
      >
        <svg
          className={styles.heartIcon}
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          <path
            className={styles.heart}
            d="M64 28C58 20 50 14 38 14C22 14 10 26 10 42C10 58 20 72 36 86C46 95 56 104 60 107Q64 110 68 107C72 104 82 95 92 86C108 72 118 58 118 42C118 26 106 14 90 14C78 14 70 20 64 28Z"
          />
        </svg>
        <svg
          className={styles.pumpkinIcon}
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          <path
            className={styles.stem}
            d="M62 31C60 22 64 13 73 10L78 20C71 21 69 25 70 32"
          />
          <path
            className={styles.pumpkinBody}
            d="M64 34C48 23 31 29 21 41C5 60 9 89 26 104C37 114 51 116 64 110C77 116 91 114 102 104C119 89 123 60 107 41C97 29 80 23 64 34Z"
          />
          <path
            className={styles.ribs}
            d="M48 39C34 53 33 88 48 103M80 39C94 53 95 88 80 103"
          />
          <path
            className={styles.face}
            d="M35 64L47 49L53 67ZM75 67L81 49L93 64ZM37 80L52 85L57 80L65 87L73 80L78 85L91 80C84 102 47 102 37 80Z"
          />
        </svg>
        <span>{count}</span>
      </button>
      {hasRequestError && (
        <ModalDefault
          message="좋아요 버튼에 문제가 생겼습니다.
          조금만 기다렸다가 다시 시도해주세요."
          onConfirm={() => setHasRequestError(false)}
        />
      )}
    </>
  )
}
