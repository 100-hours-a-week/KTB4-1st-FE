'use client'

import axios from 'axios'
import { useState } from 'react'
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
  const [liked, setLiked] = useState(isLiked)
  const [count, setCount] = useState(initialLikeCount)
  const [isPending, setIsPending] = useState(false)
  const [hasRequestError, setHasRequestError] = useState(false)

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
    setCount((currentCount) =>
      Math.max(0, currentCount + (nextLiked ? 1 : -1)),
    )
    setIsPending(true)

    try {
      if (nextLiked) {
        const response = await axios.post(
          `/bff/like/${itemId}`,
          undefined,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        const serverLikeCount = response.data?.data?.likeCount
        if (typeof serverLikeCount === 'number') {
          setCount(serverLikeCount)
        }
      } else {
        await axios.delete(`/bff/like/${itemId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
    } catch (error) {
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
      >
        <svg viewBox="0 0 128 128">
          <path
            className={styles.heart}
            d="M64 28C58 20 50 14 38 14C22 14 10 26 10 42C10 58 20 72 36 86C46 95 56 104 60 107Q64 110 68 107C72 104 82 95 92 86C108 72 118 58 118 42C118 26 106 14 90 14C78 14 70 20 64 28Z"
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
