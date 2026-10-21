'use client'

import { useState } from 'react'
import SparkleIcon from '@/components/common/chatbot/SparkleIcon'
import EventApplyModal from './EventApplyModal'
import styles from './EventApplyButton.module.css'

type EventApplyButtonProps = {
  isSeller: boolean
  otherUser: string
  requestedItemTitle: string
  offeredItemTitles: string
}

export default function EventApplyButton({
  isSeller,
  otherUser,
  requestedItemTitle,
  offeredItemTitles,
}: EventApplyButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        className={styles.button}
        type="button"
        onClick={() => setIsModalOpen(true)}
      >
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleLeft}`} />
        <span className={styles.label}>이벤트 응모하기</span>
        <SparkleIcon className={`${styles.sparkle} ${styles.sparkleRight}`} />
      </button>
      {isModalOpen && (
        <EventApplyModal
          isSeller={isSeller}
          otherUser={otherUser}
          requestedItemTitle={requestedItemTitle}
          offeredItemTitles={offeredItemTitles}
          onApply={() => setIsModalOpen(false)}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
