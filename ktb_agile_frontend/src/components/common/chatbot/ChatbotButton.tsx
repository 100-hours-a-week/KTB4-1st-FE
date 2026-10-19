'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { CHATBOT_ROUTE, CHATBOT_SCREEN_LABEL } from '@/constants/chatbot'
import { useEffect, useRef, useState } from 'react'
import '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import type {
  ChatbotAction,
  ChatbotAskResponse,
  ChatbotMessage,
} from '@/types/chatbot'
import SparkleIcon from './SparkleIcon'
import styles from './ChatbotButton.module.css'

const MAX_HISTORY_LENGTH = 10
const CLOSE_CONFIRM_MESSAGE =
  '채팅창을 닫으면\n대화 내용이 사라져요.\n닫으시겠어요?'
const GREETING = '안녕하세요! 바꾸까 AI예요. 궁금한 점을 편하게 물어보세요.'

type DisplayMessage = ChatbotMessage & {
  action?: ChatbotAction | null
  decision?: 'accepted' | 'declined'
}

export default function ChatbotButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<DisplayMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef(0)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [history, isOpen])

  // 모달을 닫으면 대화 이력이 사라지므로, 진행 중이던 요청의 응답도 무시한다.
  function closePanel() {
    sessionRef.current += 1
    setIsOpen(false)
    setIsCloseConfirmOpen(false)
    setHistory([])
    setDraft('')
    setIsSending(false)
  }

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return
      setIsCloseConfirmOpen((open) => !open)
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || isSending) return

    const session = sessionRef.current
    const previousHistory = history
      .slice(-MAX_HISTORY_LENGTH)
      .map(({ role, content }) => ({ role, content }))

    setHistory((current) => [...current, { role: 'user', content: message }])
    setDraft('')
    setIsSending(true)

    try {
      const response = await axios.post<ChatbotAskResponse>(
        '/bff/chatbot',
        { message, history: previousHistory },
        { headers: { Accept: 'application/json' } },
      )
      const answer = response.data.data?.answer
      if (!answer) throw new Error(response.data.error?.message)
      if (session !== sessionRef.current) return

      const candidate = response.data.data?.action
      const action =
        candidate &&
        candidate.screen !== 'INQUIRY' &&
        Object.hasOwn(CHATBOT_ROUTE, candidate.screen)
          ? candidate
          : null
      setHistory((current) => [
        ...current,
        { role: 'assistant', content: answer, action },
      ])
    } catch (error) {
      console.error(error)
      if (session !== sessionRef.current) return

      // 답변을 받지 못하면 보낸 메시지를 되돌려 다시 보낼 수 있게 한다.
      setHistory((current) => current.slice(0, -1))
      setDraft(message)
    } finally {
      if (session === sessionRef.current) setIsSending(false)
    }
  }

  function handleAction(index: number, accepted: boolean) {
    const message = history[index]
    if (!message.action || message.decision) return

    setHistory((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, decision: accepted ? 'accepted' : 'declined' }
          : entry,
      ),
    )
    if (!accepted) return

    const path = CHATBOT_ROUTE[message.action.screen]
    if (path) router.push(path)
  }

  return (
    <>
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
                onClick={() => setIsCloseConfirmOpen(true)}
              >
                ×
              </button>
            </header>
            <div
              className={styles.messages}
              ref={listRef}
              role="log"
              aria-live="polite"
            >
              <div className={styles.row}>
                <span className={styles.avatar} aria-hidden="true">
                  <SparkleIcon className={styles.avatarIcon} />
                </span>
                <p className={`${styles.bubble} ${styles.botBubble}`}>
                  {GREETING}
                </p>
              </div>
              {history.map((message, index) => (
                <div
                  key={index}
                  className={`${styles.row} ${
                    message.role === 'user' ? styles.userRow : ''
                  }`}
                >
                  {message.role === 'assistant' && (
                    <span className={styles.avatar} aria-hidden="true">
                      <SparkleIcon className={styles.avatarIcon} />
                    </span>
                  )}
                  <div
                    className={`${styles.bubble} ${
                      message.role === 'user'
                        ? styles.userBubble
                        : styles.botBubble
                    }`}
                  >
                    <p>{message.content}</p>
                    {message.role === 'assistant' &&
                      message.action &&
                      !message.decision && (
                        <div className={styles.action}>
                          <p>
                            {`${CHATBOT_SCREEN_LABEL[message.action.screen]} 화면으로 이동하시겠습니까?`}
                          </p>
                          <div className={styles.actionButtons}>
                            <button
                              type="button"
                              onClick={() => handleAction(index, true)}
                            >
                              예
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction(index, false)}
                            >
                              아니요
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
            <form className={styles.composer} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                value={draft}
                maxLength={300}
                placeholder="메시지를 입력하세요"
                aria-label="메시지 입력"
                onChange={(event) => setDraft(event.target.value)}
              />
              <button
                className={styles.sendButton}
                type="submit"
                aria-label="보내기"
                disabled={!draft.trim() || isSending}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Z" />
                </svg>
              </button>
            </form>
          </section>
        )}
        <button
          className={`${styles.button} ${isOpen ? styles.buttonOpen : ''}`}
          type="button"
          aria-label={isOpen ? '챗봇 닫기' : '챗봇 열기'}
          aria-expanded={isOpen}
          onClick={() =>
            isOpen ? setIsCloseConfirmOpen(true) : setIsOpen(true)
          }
        >
          <span className={styles.buttonLabel}>AI</span>
          <SparkleIcon className={styles.buttonIcon} />
        </button>
      </div>
      {isCloseConfirmOpen && (
        <ModalDefault
          message={CLOSE_CONFIRM_MESSAGE}
          confirmLabel="확인"
          onConfirm={closePanel}
          onCancel={() => setIsCloseConfirmOpen(false)}
        />
      )}
    </>
  )
}
