'use client'

import { useEffect, useState } from 'react'
import SparkleIcon from './SparkleIcon'
import styles from './ChatbotButton.module.css'

const GREETING = '안녕하세요! 바꾸까 AI예요. 궁금한 점을 편하게 물어보세요.'

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className={styles.container}>
      {isOpen && (
        <section
          className={styles.panel}
          role="dialog"
          aria-label="바꾸까 AI 채팅"
        >
          <header className={styles.header}>
            <span className={styles.headerBadge} aria-hidden="true">
              <SparkleIcon className={styles.headerBadgeIcon} />
            </span>
            <div className={styles.headerText}>
              <h2 className={styles.title}>바꾸까 AI</h2>
              <p className={styles.subtitle}>궁금한 점을 물어보세요</p>
            </div>
            <button
              className={styles.closeButton}
              type="button"
              aria-label="채팅창 닫기"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>
          <div className={styles.messages}>
            <div className={styles.row}>
              <span className={styles.avatar} aria-hidden="true">
                <SparkleIcon className={styles.avatarIcon} />
              </span>
              <p className={`${styles.bubble} ${styles.botBubble}`}>
                {GREETING}
              </p>
            </div>
          </div>
          <div className={styles.composer} aria-hidden="true">
            <div className={styles.input}>메시지를 입력하세요</div>
            <span className={styles.sendButton}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Z" />
              </svg>
            </span>
          </div>
        </section>
      )}
      <button
        className={`${styles.button} ${isOpen ? styles.buttonOpen : ''}`}
        type="button"
        aria-label={isOpen ? '챗봇 닫기' : '챗봇 열기'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.buttonLabel}>AI</span>
        <SparkleIcon className={styles.buttonIcon} />
      </button>
    </div>
  )
}
