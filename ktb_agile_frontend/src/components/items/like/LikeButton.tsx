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
            transform="translate(0 5) scale(1 0.90)"
            d="M64 116c-5 0-9-2-14-6C27 97 7 72 7 45c0-20 14-37 34-37 11 0 19 9 23 26 4-17 12-26 23-26 20 0 34 17 34 37 0 27-20 52-43 65-5 4-9 6-14 6Z"
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
