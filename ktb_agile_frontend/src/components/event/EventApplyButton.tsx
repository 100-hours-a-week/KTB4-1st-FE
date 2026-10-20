'use client'

import { useState } from 'react'
import SparkleIcon from '@/components/common/chatbot/SparkleIcon'
import EventApplyModal from './EventApplyModal'
import styles from './EventApplyButton.module.css'

export default function EventApplyButton() {
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
          onApply={() => setIsModalOpen(false)}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}
