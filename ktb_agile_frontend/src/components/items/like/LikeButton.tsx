'use client'

import axios from 'axios'
import { useState } from 'react'
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
      console.error('물품 좋아요 요청에 실패했습니다.', error)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      aria-pressed={liked}
      className={`${styles.button}${liked ? ` ${styles.liked}` : ''}${
        placement === 'title' ? ` ${styles.titlePlacement}` : ''
      }`}
      onClick={toggleLike}
      disabled={isPending}
      type="button"
    >
      <svg aria-hidden="true" viewBox="0 0 128 128">
        <path
          className={styles.heart}
          transform="translate(0 5) scale(1 0.92)"
          d="M64 116C53 108 10 78 10 46 10 24 23 11 43 11c10 0 17 9 21 23 5-14 13-23 23-23 19 0 32 13 31 35-1 32-44 62-54 70Z"
        />
      </svg>
      <span>{count}</span>
    </button>
  )
}
