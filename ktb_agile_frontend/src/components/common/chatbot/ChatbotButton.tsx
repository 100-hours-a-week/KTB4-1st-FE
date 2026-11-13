'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { CHATBOT_ROUTE, CHATBOT_SCREEN_LABEL } from '@/constants/chatbot'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/config/api'
import type {
  ChatbotAction,
  ChatbotAskResponse,
  ChatbotMessage,
} from '@/types/chatbot'
import { getAccessTokenOrRedirect } from '@/utils/auth'
import SparkleIcon from './SparkleIcon'
import styles from './ChatbotButton.module.css'

const MAX_HISTORY_LENGTH = 10
const SESSION_STORAGE_KEY = 'chatbot-session'
const MAX_MESSAGE_LENGTH = 500
const LENGTH_TOAST_DURATION = 2000
const GREETING = '안녕하세요! 바꾸까 AI예요. 궁금한 점을 편하게 물어보세요.'

type DisplayMessage = ChatbotMessage & {
  action?: ChatbotAction | null
  decision?: 'accepted' | 'declined'
}

type ChatSession = { history: DisplayMessage[]; draft: string }

function readSession(): ChatSession {
  try {
    const saved = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!saved) return { history: [], draft: '' }
    const value = JSON.parse(saved)
    if (!Array.isArray(value.history) || typeof value.draft !== 'string') {
      return { history: [], draft: '' }
    }
    const history: DisplayMessage[] = value.history
      .filter(
        (entry: unknown): entry is ChatbotMessage =>
          !!entry &&
          typeof entry === 'object' &&
          'role' in entry &&
          (entry.role === 'user' || entry.role === 'assistant') &&
          'content' in entry &&
          typeof entry.content === 'string',
      )
      .slice(-MAX_HISTORY_LENGTH)
      .map((entry: DisplayMessage) => ({
        role: entry.role,
        content: entry.content,
        action:
          entry.action &&
          entry.action.screen !== 'INQUIRY' &&
          Object.hasOwn(CHATBOT_ROUTE, entry.action.screen)
            ? entry.action
            : null,
        decision:
          entry.decision === 'accepted' || entry.decision === 'declined'
            ? entry.decision
            : undefined,
      }))
    return { history, draft: value.draft.slice(0, MAX_MESSAGE_LENGTH) }
  } catch {
    return { history: [], draft: '' }
  }
}

export default function ChatbotButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<DisplayMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<ChatSession>({ history: [], draft: '' })
  const restoredRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  const [showLengthToast, setShowLengthToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    [],
  )

  function notifyLengthLimit() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setShowLengthToast(true)
    toastTimerRef.current = setTimeout(
      () => setShowLengthToast(false),
      LENGTH_TOAST_DURATION,
    )
  }

  function saveSession(session: ChatSession) {
    sessionRef.current = session
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(session),
      )
    } catch {
      // 저장소를 사용할 수 없어도 현재 화면의 대화는 유지한다.
    }
  }

  function openPanel() {
    if (!restoredRef.current) {
      const session = readSession()
      sessionRef.current = session
      setHistory(session.history)
      setDraft(session.draft)
      restoredRef.current = true
    }
    setIsOpen(true)
  }

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [history, pendingMessage, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return
      setIsOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || requestRef.current) return

    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    const controller = new AbortController()
    requestRef.current = controller
    const previousHistory = history
      .slice(-MAX_HISTORY_LENGTH)
      .map(({ role, content }) => ({ role, content }))

    // 완료된 대화는 응답 성공 후에만 교체한다. 페이지를 떠나면 질문을 재작성할 수 있다.
    saveSession({ history: sessionRef.current.history, draft: message })
    setPendingMessage(message)
    setDraft('')
    setIsSending(true)

    try {
      const response = await axios.post<ChatbotAskResponse>(
        `${API_BASE_URL}/chatbot/ask`,
        { message, history: previousHistory },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      )
      const answer = response.data.data?.answer
      if (!answer) throw new Error(response.data.error?.message)
      if (controller.signal.aborted) return

      const candidate = response.data.data?.action
      const action =
        candidate &&
        candidate.screen !== 'INQUIRY' &&
        Object.hasOwn(CHATBOT_ROUTE, candidate.screen)
          ? candidate
          : null
      const completedMessages: DisplayMessage[] = [
        { role: 'user', content: message },
        { role: 'assistant', content: answer, action },
      ]
      const nextHistory = [
        ...sessionRef.current.history,
        ...completedMessages,
      ].slice(-MAX_HISTORY_LENGTH)
      saveSession({ history: nextHistory, draft: '' })
      setHistory(nextHistory)
    } catch (error) {
      if (controller.signal.aborted) return
      console.error(error)

      // 답변을 받지 못하면 보낸 메시지를 되돌려 다시 보낼 수 있게 한다.
      setDraft(message)
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null
        setPendingMessage(null)
        setIsSending(false)
      }
    }
  }

  function handleAction(index: number, accepted: boolean) {
    const message = history[index]
    if (!message.action || message.decision) return

    const nextHistory = history.map((entry, entryIndex): DisplayMessage =>
      entryIndex === index
        ? { ...entry, decision: accepted ? 'accepted' : 'declined' }
        : entry,
    )
    saveSession({ ...sessionRef.current, history: nextHistory })
    setHistory(nextHistory)
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
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </header>
            <div className={styles.toastAnchor}>
              {showLengthToast && (
                <p className={styles.toast} role="status">
                  {`메시지는 ${MAX_MESSAGE_LENGTH}자까지만 입력할 수 있어요.`}
                </p>
              )}
            </div>
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
              {pendingMessage && (
                <div className={`${styles.row} ${styles.userRow}`}>
                  <p className={`${styles.bubble} ${styles.userBubble}`}>
                    {pendingMessage}
                  </p>
                </div>
              )}
            </div>
            <form className={styles.composer} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                value={draft}
                placeholder="메시지를 입력하세요"
                aria-label="메시지 입력"
                disabled={isSending}
                onChange={(event) => {
                  let nextDraft = event.target.value
                  // maxLength 속성은 초과 입력을 조용히 버리므로 직접 잘라내고 안내한다.
                  if (nextDraft.length > MAX_MESSAGE_LENGTH) {
                    nextDraft = nextDraft.slice(0, MAX_MESSAGE_LENGTH)
                    notifyLengthLimit()
                  }
                  setDraft(nextDraft)
                  saveSession({ ...sessionRef.current, draft: nextDraft })
                }}
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
          onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        >
          <span className={styles.buttonLabel}>AI</span>
          <SparkleIcon className={styles.buttonIcon} />
        </button>
      </div>
    </>
  )
}
