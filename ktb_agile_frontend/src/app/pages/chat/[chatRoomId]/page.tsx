'use client'

import axios from 'axios'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import ChatMessageBubble, {
  type ChatMessage,
} from '@/components/chat/ChatMessageBubble/ChatMessageBubble'
import ChatRoomInfo from '@/components/chat/ChatRoomInfo/ChatRoomInfo'
import Navbar from '@/components/common/navbar/Navbar'
import { API_BASE_URL } from '@/config/api'
import { getUserIdFromAccessToken } from '@/utils/auth'
import { useChatRoomSocket } from '@/hooks/useChatRoomSocket'
import styles from './page.module.css'

type ChatMessageDto = {
  messageId: number
  sender?: { userId: number; nickname: string }
  userId?: number
  content: string
  messageType: string
  isMine?: boolean
  createdAt: string
}

type ChatMessageResponse = {
  data: {
    chatRoomId?: number
    messages: ChatMessageDto[]
    nextCursor: string | null
    hasNext: boolean
  } | null
  error: { code: string; message: string } | null
}

function timeLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function toMessage(
  message: ChatMessageDto,
  userId: number | null,
  otherUser: string,
): ChatMessage {
  const mine =
    message.isMine ??
    (userId !== null && (message.sender?.userId ?? message.userId) === userId)
  return {
    id: message.messageId,
    side: mine ? 'mine' : 'theirs',
    content: message.content,
    time: timeLabel(new Date(message.createdAt)),
    senderName: message.sender?.nickname ?? otherUser,
  }
}

function ChatRoomContent() {
  const router = useRouter()
  const { chatRoomId } = useParams<{ chatRoomId: string }>()
  const searchParams = useSearchParams()
  const title = searchParams.get('title') ?? '게시글 제목1'
  const group = searchParams.get('group') ?? '그룹1'
  const otherUser = searchParams.get('user') ?? '사용자2'
  const image = searchParams.get('image')
  const isSeller = searchParams.get('direction') !== 'SENT'
  const itemId = Number(searchParams.get('itemId'))
  const exchangeRequestId = Number(searchParams.get('exchangeRequestId'))
  const returnTo = `/pages/chat/${chatRoomId}?${searchParams.toString()}`
  const messagesRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isUpdatingExchange, setIsUpdatingExchange] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [socketError, setSocketError] = useState<string | null>(null)
  const [exchangeStatus, setExchangeStatus] = useState<
    'available' | 'completed' | 'rejected' | 'canceled' | 'closed'
  >(() => {
    const status = searchParams.get('status')
    return status === 'COMPLETED'
      ? 'completed'
      : status === 'REJECTED'
        ? 'rejected'
        : status === 'CANCELED'
          ? 'canceled'
          : status === 'CLOSED'
            ? 'closed'
            : 'available'
  })

  const { isConnected, sendMessage } = useChatRoomSocket({
    chatRoomId,
    onMessage: (incoming) => {
      const token = window.sessionStorage.getItem('accessToken')
      const incomingMessage = toMessage(
        incoming,
        token ? getUserIdFromAccessToken(token) : null,
        otherUser,
      )
      setMessages((current) =>
        current.some((message) => message.id === incomingMessage.id)
          ? current
          : [...current, incomingMessage],
      )
      setSocketError(null)
    },
    onError: setSocketError,
  })

  function handleSendMessage() {
    const content = messageInput.trim()
    if (!content) return
    if (content.length > 2000) {
      setSocketError('메시지는 2000자 이내로 입력해주세요.')
      return
    }
    if (!sendMessage(content)) {
      setSocketError('채팅 서버에 연결된 후 다시 시도해주세요.')
      return
    }
    setMessageInput('')
    setSocketError(null)
  }

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    const controller = new AbortController()
    async function loadMessages() {
      try {
        if (
          !Number.isSafeInteger(Number(chatRoomId)) ||
          Number(chatRoomId) < 1
        ) {
          throw new Error('올바른 채팅방 ID가 필요합니다.')
        }
        const response = await axios.get<ChatMessageResponse>(
          `${API_BASE_URL}/chat/rooms/${chatRoomId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )
        if (!response.data.data || response.data.error) {
          throw new Error(
            response.data.error?.message || '메시지를 불러오지 못했습니다.',
          )
        }
        const page = response.data.data
        setMessages(
          page.messages.map((message) =>
            toMessage(message, getUserIdFromAccessToken(token!), otherUser),
          ),
        )
        setNextCursor(page.nextCursor)
        setHasNext(page.hasNext)
        setMessageError(null)
      } catch (cause) {
        if (axios.isCancel(cause) || controller.signal.aborted) return
        if (axios.isAxiosError(cause) && cause.response?.status === 401) {
          router.replace('/auth/login')
          return
        }
        setMessageError(
          axios.isAxiosError<ChatMessageResponse>(cause)
            ? cause.response?.data?.error?.message ||
                '메시지를 불러오지 못했습니다.'
            : cause instanceof Error
              ? cause.message
              : '메시지를 불러오지 못했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadMessages()
    return () => controller.abort()
  }, [chatRoomId, otherUser, retryCount, router])

  async function loadOlderMessages() {
    if (!nextCursor || isLoadingMore) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    setIsLoadingMore(true)
    setMessageError(null)
    try {
      const response = await axios.get<ChatMessageResponse>(
        `${API_BASE_URL}/chat/rooms/${chatRoomId}/messages`,
        {
          params: { cursor: nextCursor },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )
      if (!response.data.data || response.data.error) {
        throw new Error(
          response.data.error?.message || '이전 메시지를 불러오지 못했습니다.',
        )
      }
      const page = response.data.data
      const older = page.messages.map((message) =>
        toMessage(message, getUserIdFromAccessToken(token), otherUser),
      )
      setMessages((current) => [
        ...older.filter(
          (message) => !current.some((entry) => entry.id === message.id),
        ),
        ...current,
      ])
      setNextCursor(page.nextCursor)
      setHasNext(page.hasNext)
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        router.replace('/auth/login')
        return
      }
      setMessageError(
        axios.isAxiosError<ChatMessageResponse>(cause)
          ? cause.response?.data?.error?.message ||
              '이전 메시지를 불러오지 못했습니다.'
          : cause instanceof Error
            ? cause.message
            : '이전 메시지를 불러오지 못했습니다.',
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function leaveChatRoom() {
    if (!window.confirm('채팅방을 나가시겠습니까?')) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    setIsLeaving(true)
    setActionError(null)
    try {
      await axios.delete(
        `${API_BASE_URL}/chat-rooms/${chatRoomId}/members/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )
      router.replace('/pages/chat')
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        router.replace('/auth/login')
        return
      }
      setActionError(
        axios.isAxiosError<ChatMessageResponse>(cause)
          ? cause.response?.data?.error?.message ||
              '채팅방을 나가지 못했습니다.'
          : '채팅방을 나가지 못했습니다.',
      )
      setIsLeaving(false)
      setMenuOpen(false)
    }
  }

  async function changeExchangeStatus(
    status: 'COMPLETED' | 'REJECTED' | 'CANCELED',
  ) {
    if (!Number.isSafeInteger(exchangeRequestId) || exchangeRequestId < 1)
      return
    const action =
      status === 'COMPLETED' ? '완료' : status === 'REJECTED' ? '거절' : '취소'
    if (!window.confirm(`교환 제안을 ${action}하시겠습니까?`)) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    setIsUpdatingExchange(true)
    setActionError(null)
    try {
      if (status === 'CANCELED') {
        await axios.delete(
          `${API_BASE_URL}/exchange-requests/${exchangeRequestId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )
      } else {
        await axios.patch(
          `${API_BASE_URL}/exchange-requests/${exchangeRequestId}/status`,
          { status },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        )
      }
      setExchangeStatus(
        status === 'COMPLETED'
          ? 'completed'
          : status === 'REJECTED'
            ? 'rejected'
            : 'canceled',
      )
      setMenuOpen(false)
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        router.replace('/auth/login')
        return
      }
      setActionError(
        axios.isAxiosError<ChatMessageResponse>(cause)
          ? cause.response?.data?.error?.message ||
              `교환 제안을 ${action}하지 못했습니다.`
          : `교환 제안을 ${action}하지 못했습니다.`,
      )
    } finally {
      setIsUpdatingExchange(false)
    }
  }

  return (
    <>
      <section className={styles.page} aria-label="채팅방">
        <header className={styles.header}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => router.push('/pages/chat')}
            aria-label="채팅 목록으로 돌아가기"
          >
            <img src="/figma/chat/back.svg" alt="" width="24" height="24" />
          </button>
          <h1>채팅</h1>
          <div className={styles.menuAnchor}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="채팅방 메뉴"
              aria-expanded={menuOpen}
            >
              <img src="/figma/chat/more.svg" alt="" width="24" height="24" />
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                {!isSeller &&
                  exchangeStatus === 'available' &&
                  Number.isSafeInteger(exchangeRequestId) &&
                  exchangeRequestId > 0 && (
                    <button
                      type="button"
                      onClick={() => void changeExchangeStatus('CANCELED')}
                      disabled={isUpdatingExchange}
                    >
                      제안 취소
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => void leaveChatRoom()}
                  disabled={isLeaving}
                >
                  {isLeaving ? '나가는 중...' : '채팅방 나가기'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.content}>
          <ChatRoomInfo
            title={title}
            group={group}
            otherUser={otherUser}
            image={image}
            isSeller={isSeller}
            itemId={itemId}
            exchangeRequestId={exchangeRequestId}
            exchangeStatus={exchangeStatus}
            isUpdatingExchange={isUpdatingExchange}
            returnTo={returnTo}
            onUpdateExchange={(status) => void changeExchangeStatus(status)}
            onEditExchange={(editItemId, editRequestId, editReturnTo) =>
              router.push(
                `/pages/chat/exchange/edit?${new URLSearchParams({ itemId: String(editItemId), exchangeRequestId: String(editRequestId), returnTo: editReturnTo }).toString()}`,
              )
            }
          />

          {actionError && <p className={styles.error}>{actionError}</p>}
          {socketError && <p className={styles.error}>{socketError}</p>}
          <div className={styles.messages} aria-live="polite" ref={messagesRef}>
            {isLoading && (
              <p className={styles.state}>메시지를 불러오는 중입니다.</p>
            )}
            {!isLoading && hasNext && nextCursor && (
              <button
                className={styles.loadMore}
                type="button"
                onClick={() => void loadOlderMessages()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? '불러오는 중...' : '이전 메시지 보기'}
              </button>
            )}
            {!isLoading && messageError && (
              <div className={styles.state}>
                <p>{messageError}</p>
                {!messages.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true)
                      setRetryCount((count) => count + 1)
                    }}
                  >
                    다시 시도
                  </button>
                )}
              </div>
            )}
            {!isLoading && !messageError && messages.length === 0 && (
              <p className={styles.state}>아직 메시지가 없습니다.</p>
            )}

            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>
        </div>

        <div className={styles.composer}>
          <label className={styles.visuallyHidden} htmlFor="chat-message">
            메시지
          </label>
          <input
            id="chat-message"
            placeholder={
              isConnected ? '메시지를 입력하세요' : '채팅 서버 연결 중...'
            }
            value={messageInput}
            maxLength={2000}
            disabled={!isConnected}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <button
            type="button"
            aria-label="메시지 보내기"
            disabled={!isConnected || !messageInput.trim()}
            onClick={handleSendMessage}
          >
            <img src="/figma/chat/send.svg" alt="" width="20" height="20" />
          </button>
        </div>
      </section>
      <Navbar />
    </>
  )
}

export default function ChatRoomPage() {
  return (
    <Suspense fallback={<p>채팅방을 불러오는 중입니다.</p>}>
      <ChatRoomContent />
    </Suspense>
  )
}
