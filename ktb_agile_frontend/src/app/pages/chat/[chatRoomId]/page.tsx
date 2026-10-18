'use client'

import {
  CHAT_ROOM_STATUS,
  CHAT_EXCHANGE_STATUS,
  CHAT_MESSAGE_TYPE,
} from '@/constants/chat'
import { EXCHANGE_STATUS } from '@/constants/exchange'
import { CHAT_ERRORS } from '@/constants/errors/chat'
import axios from 'axios'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import ChatMessageBubble, {
  type ChatMessage,
} from '@/components/chat/ChatMessageBubble/ChatMessageBubble'
import ChatRoomInfo from '@/components/chat/ChatRoomInfo/ChatRoomInfo'
import ChatRoomMenu from '@/components/chat/ChatRoomMenu/ChatRoomMenu'
import Navbar from '@/components/common/navbar/Navbar'
import { API_BASE_URL } from '@/config/api'
import { getUserIdFromAccessToken } from '@/utils/auth'
import { useChatRoomSocket } from '@/hooks/useChatRoomSocket'
import type {
  ChatRoom,
  ChatRoomDetail,
  ChatRoomDetailResponse,
  ExchangeUpdateStatus,
} from '@/types/chatRoom'
import type { ChatMessageDto, ChatMessageResponse } from '@/types/chatMessage'
import styles from './page.module.css'

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function toMessage(
  message: Pick<
    ChatMessageDto,
    'messageId' | 'userId' | 'content' | 'messageType' | 'createdAt'
  >,
  userId: number | null,
  otherUser: string,
): ChatMessage {
  const mine = userId !== null && message.userId === userId
  // 서버의 시간대 없는 LocalDateTime도 한국 시간으로 해석합니다.
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(message.createdAt)
    ? message.createdAt
    : `${message.createdAt}+09:00`
  const date = new Date(timestamp)
  const validDate = !Number.isNaN(date.getTime())
  const parts = validDate ? dateFormatter.formatToParts(date) : []
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return {
    id: message.messageId,
    messageType: message.messageType,
    side: mine ? 'mine' : 'theirs',
    content: message.content,
    time: validDate ? timeFormatter.format(date) : '',
    dateKey: validDate ? `${year}-${month}-${day}` : '',
    dateLabel: validDate ? `${year}년 ${Number(month)}월 ${Number(day)}일` : '',
    senderName: otherUser,
  }
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const merged = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) {
    if (!merged.has(message.id)) merged.set(message.id, message)
  }
  return [...merged.values()].sort((a, b) => a.id - b.id)
}

function ChatRoomContent({ direction }: { direction: ChatRoom['direction'] }) {
  const router = useRouter()
  const { chatRoomId } = useParams<{ chatRoomId: string }>()
  const searchParams = useSearchParams()
  const group = searchParams.get('group') ?? ''
  const otherUser = searchParams.get('user') ?? ''
  const isSeller = direction === 'RECEIVED'
  const isRequester = direction === 'SENT'
  const returnTo = `/pages/chat/${chatRoomId}?${searchParams.toString()}`
  const messagesRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messageElements = useMemo(
    () =>
      messages.map((message, index) => (
        <Fragment key={message.id}>
          {message.dateKey &&
            message.dateKey !== messages[index - 1]?.dateKey && (
              <div className={styles.dateSeparator}>
                <time dateTime={message.dateKey}>{message.dateLabel}</time>
              </div>
            )}
          <ChatMessageBubble message={message} />
        </Fragment>
      )),
    [messages],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isClosedByEvent, setIsClosedByEvent] = useState(false)
  const [isUpdatingExchange, setIsUpdatingExchange] = useState(false)
  const [roomDetail, setRoomDetail] = useState<ChatRoomDetail | null>(null)
  const [detailFailure, setDetailFailure] = useState<{
    chatRoomId: string
    message: string
  } | null>(null)
  const [detailRetryCount, setDetailRetryCount] = useState(0)
  const detail =
    roomDetail?.chatRoomId === Number(chatRoomId) ? roomDetail : null
  const detailError =
    detailFailure?.chatRoomId === chatRoomId ? detailFailure.message : null
  const exchangeRequest = detail?.exchangeRequest
  const isChatClosed =
    isClosedByEvent ||
    detail?.chatRoomStatus === CHAT_ROOM_STATUS.CLOSED ||
    exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.REJECTED ||
    exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.CANCELED
  const exchangeRequestId = exchangeRequest?.exchangeRequestId ?? 0
  const itemAvailable = exchangeRequest
    ? exchangeRequest.requestedQuantity > 0 &&
      exchangeRequest.requestedItem.availableQuantity >=
        exchangeRequest.requestedQuantity &&
      exchangeRequest.offeredItems.every(
        (item) =>
          item.offeredQuantity > 0 &&
          item.availableQuantity >= item.offeredQuantity,
      )
    : null
  const exchangeStatus =
    isClosedByEvent || detail?.chatRoomStatus === CHAT_ROOM_STATUS.CLOSED
      ? CHAT_EXCHANGE_STATUS.CLOSED
      : exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.COMPLETED
        ? CHAT_EXCHANGE_STATUS.COMPLETED
        : exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.REJECTED
          ? CHAT_EXCHANGE_STATUS.REJECTED
          : exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.CANCELED
            ? CHAT_EXCHANGE_STATUS.CANCELED
            : CHAT_EXCHANGE_STATUS.AVAILABLE
  const [actionError, setActionError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const isComposingRef = useRef(false)
  const [socketError, setSocketError] = useState<string | null>(null)

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    const controller = new AbortController()
    async function loadDetail() {
      try {
        if (
          !Number.isSafeInteger(Number(chatRoomId)) ||
          Number(chatRoomId) < 1
        ) {
          throw new Error(CHAT_ERRORS.ROOM_ID_INVALID)
        }
        const response = await axios.get<ChatRoomDetailResponse>(
          `/bff/chat-rooms/${chatRoomId}`,
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
            response.data.error?.message || CHAT_ERRORS.ROOM_DETAIL_LOAD_FAILED,
          )
        }
        if (controller.signal.aborted) return
        setRoomDetail(response.data.data)
        setDetailFailure(null)
      } catch (cause) {
        if (axios.isCancel(cause) || controller.signal.aborted) return
        setDetailFailure({
          chatRoomId,
          message: axios.isAxiosError<ChatRoomDetailResponse>(cause)
            ? cause.response?.data?.error?.message ||
              CHAT_ERRORS.ROOM_DETAIL_LOAD_FAILED
            : cause instanceof Error
              ? cause.message
              : CHAT_ERRORS.ROOM_DETAIL_LOAD_FAILED,
        })
      }
    }
    void loadDetail()
    return () => controller.abort()
  }, [chatRoomId, detailRetryCount, router])

  useEffect(() => {
    const lastMessage = messages.at(-1)
    if (!lastMessage) return

    if (lastMessageIdRef.current !== lastMessage.id) {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }

    lastMessageIdRef.current = lastMessage.id
  }, [messages])

  const { isConnected, sendMessage } = useChatRoomSocket({
    chatRoomId,
    onMessage: (incoming) => {
      if (
        incoming.messageType === CHAT_MESSAGE_TYPE.SYSTEM &&
        (incoming.systemEventType === 'CHAT_ROOM_MEMBER_LEFT' ||
          incoming.systemEventType === 'EXCHANGE_REQUEST_REJECTED' ||
          incoming.systemEventType === 'EXCHANGE_REQUEST_CANCELED')
      ) {
        setIsClosedByEvent(true)
        setMessageInput('')
      }
      const token = window.sessionStorage.getItem('accessToken')
      const incomingMessage = toMessage(
        incoming,
        token ? getUserIdFromAccessToken(token) : null,
        otherUser,
      )
      setMessages((current) => mergeMessages(current, [incomingMessage]))
      setSocketError(null)
    },
    onError: setSocketError,
  })

  const canSendMessage =
    !isChatClosed && !isLeaving && isConnected && !isLoading && isHistoryLoaded

  function handleSendMessage(value: string) {
    if (!canSendMessage) return
    const content = value.trim()
    if (!content) return
    if (content.length > 2000) {
      setSocketError(CHAT_ERRORS.MESSAGE_TOO_LONG)
      return
    }
    if (!sendMessage(content)) {
      setSocketError(CHAT_ERRORS.NOT_CONNECTED)
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
      setIsLoading(true)
      try {
        if (
          !Number.isSafeInteger(Number(chatRoomId)) ||
          Number(chatRoomId) < 1
        ) {
          throw new Error(CHAT_ERRORS.ROOM_ID_INVALID)
        }
        const response = await axios.get<ChatMessageResponse>(
          `/bff/chat/rooms/${chatRoomId}/messages`,
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
            response.data.error?.message || CHAT_ERRORS.MESSAGE_LOAD_FAILED,
          )
        }
        if (controller.signal.aborted) return
        const page = response.data.data
        const history = page.messages.map((message) =>
          toMessage(message, getUserIdFromAccessToken(token!), otherUser),
        )
        setMessages((current) => mergeMessages(current, history))
        setIsHistoryLoaded(true)
        setNextCursor(page.nextCursor)
        setHasNext(page.hasNext)
        setMessageError(null)
      } catch (cause) {
        if (axios.isCancel(cause) || controller.signal.aborted) return
        setMessageError(
          axios.isAxiosError<ChatMessageResponse>(cause)
            ? cause.response?.data?.error?.message ||
                CHAT_ERRORS.MESSAGE_LOAD_FAILED
            : cause instanceof Error
              ? cause.message
              : CHAT_ERRORS.MESSAGE_LOAD_FAILED,
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
        `/bff/chat/rooms/${chatRoomId}/messages`,
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
          response.data.error?.message || CHAT_ERRORS.OLDER_MESSAGE_LOAD_FAILED,
        )
      }
      const page = response.data.data
      const older = page.messages.map((message) =>
        toMessage(message, getUserIdFromAccessToken(token), otherUser),
      )
      setMessages((current) => mergeMessages(current, older))
      setNextCursor(page.nextCursor)
      setHasNext(page.hasNext)
    } catch (cause) {
      setMessageError(
        axios.isAxiosError<ChatMessageResponse>(cause)
          ? cause.response?.data?.error?.message ||
              CHAT_ERRORS.OLDER_MESSAGE_LOAD_FAILED
          : cause instanceof Error
            ? cause.message
            : CHAT_ERRORS.OLDER_MESSAGE_LOAD_FAILED,
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function cancelExchangeRequest(token: string) {
    await axios.delete(
      `${API_BASE_URL}/exchange-requests/${exchangeRequestId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    )
  }

  async function leaveChatRoom() {
    if (isLeaving) return
    if (
      !window.confirm(
        `채팅방을 나가시겠습니까? 진행 중인 교환은 자동으로 ${isSeller ? '거절' : '취소'}됩니다.`,
      )
    )
      return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    setIsLeaving(true)
    setActionError(null)
    try {
      if (!detail) throw new Error(CHAT_ERRORS.LEAVE_FAILED)
      if (exchangeRequest?.exchangeStatus === EXCHANGE_STATUS.PENDING) {
        const status = isSeller
          ? EXCHANGE_STATUS.REJECTED
          : EXCHANGE_STATUS.CANCELED
        if (isSeller) {
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
        } else {
          await cancelExchangeRequest(token)
        }
        setRoomDetail((current) =>
          current?.chatRoomId === Number(chatRoomId)
            ? {
                ...current,
                chatRoomStatus: CHAT_ROOM_STATUS.CLOSED,
                exchangeRequest: {
                  ...current.exchangeRequest,
                  exchangeStatus: status,
                },
              }
            : current,
        )
      }
      await axios.delete(
        `${API_BASE_URL}/chat-rooms/${chatRoomId}/members/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )
      setIsClosedByEvent(true)
      router.replace('/pages/chat')
    } catch {
      setActionError(CHAT_ERRORS.LEAVE_FAILED)
      setIsLeaving(false)
      setMenuOpen(false)
    }
  }

  async function changeExchangeStatus(status: ExchangeUpdateStatus) {
    if (
      itemAvailable !== true ||
      exchangeStatus !== CHAT_EXCHANGE_STATUS.AVAILABLE ||
      !detail
    )
      return
    if (status === EXCHANGE_STATUS.CANCELED ? !isRequester : !isSeller) return
    if (!Number.isSafeInteger(exchangeRequestId) || exchangeRequestId < 1)
      return
    const action =
      status === EXCHANGE_STATUS.COMPLETED
        ? '완료'
        : status === EXCHANGE_STATUS.REJECTED
          ? '거절'
          : '취소'
    if (!window.confirm(`교환 제안을 ${action}하시겠습니까?`)) return
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    setIsUpdatingExchange(true)
    setActionError(null)
    try {
      if (status === EXCHANGE_STATUS.CANCELED) {
        await cancelExchangeRequest(token)
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
      setRoomDetail((current) =>
        current?.chatRoomId === Number(chatRoomId)
          ? {
              ...current,
              exchangeRequest: {
                ...current.exchangeRequest,
                exchangeStatus: status,
              },
            }
          : current,
      )
      setMenuOpen(false)
    } catch (cause) {
      setActionError(
        axios.isAxiosError<ChatMessageResponse>(cause)
          ? cause.response?.data?.error?.message ||
              CHAT_ERRORS.EXCHANGE_ACTION_FAILED(action)
          : CHAT_ERRORS.EXCHANGE_ACTION_FAILED(action),
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
              <ChatRoomMenu
                isRequester={isRequester}
                exchangeStatus={exchangeStatus}
                itemAvailable={itemAvailable}
                exchangeRequestId={exchangeRequestId}
                isUpdatingExchange={isUpdatingExchange}
                isLeaving={isLeaving}
                onCancelExchange={() =>
                  void changeExchangeStatus(EXCHANGE_STATUS.CANCELED)
                }
                onLeave={() => void leaveChatRoom()}
              />
            )}
          </div>
        </header>

        <div className={styles.content}>
          {detail && exchangeRequest ? (
            <ChatRoomInfo
              exchangeRequest={exchangeRequest}
              group={group}
              otherUser={otherUser}
              direction={direction}
              chatRoomStatus={
                isClosedByEvent
                  ? CHAT_ROOM_STATUS.CLOSED
                  : detail.chatRoomStatus
              }
              itemAvailable={itemAvailable}
              isUpdatingExchange={isUpdatingExchange}
              returnTo={returnTo}
              onUpdateExchange={(status) => void changeExchangeStatus(status)}
              onEditExchange={(editItemId, editRequestId, editReturnTo) =>
                router.push(
                  `/pages/chat/exchange/edit?${new URLSearchParams({ itemId: String(editItemId), exchangeRequestId: String(editRequestId), returnTo: editReturnTo }).toString()}`,
                )
              }
            />
          ) : detailError ? (
            <div className={styles.state} role="alert">
              <p>{detailError}</p>
              <button
                type="button"
                onClick={() => {
                  setDetailFailure(null)
                  setDetailRetryCount((count) => count + 1)
                }}
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className={styles.state}>교환 요청 정보를 불러오는 중입니다.</p>
          )}

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
                {!isHistoryLoaded && (
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

            {messageElements}
          </div>
        </div>

        {!isChatClosed && (
          <div className={styles.composer}>
            <label className={styles.visuallyHidden} htmlFor="chat-message">
              메시지
            </label>
            <input
              id="chat-message"
              placeholder={
                isLoading
                  ? '메시지를 불러오는 중입니다.'
                  : !isHistoryLoaded
                    ? '메시지 이력을 불러오지 못했습니다.'
                    : isConnected
                      ? '메시지를 입력하세요'
                      : '채팅 서버 연결 중...'
              }
              value={messageInput}
              maxLength={2000}
              disabled={!canSendMessage}
              onChange={(event) => setMessageInput(event.target.value)}
              onCompositionStart={() => {
                isComposingRef.current = true
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false
              }}
              onKeyUp={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                if (isComposingRef.current || event.nativeEvent.isComposing)
                  return
                handleSendMessage(event.currentTarget.value)
              }}
            />
            <button
              type="button"
              aria-label="메시지 보내기"
              disabled={!canSendMessage || !messageInput.trim()}
              onClick={() => handleSendMessage(messageInput)}
            >
              <img src="/figma/chat/send.svg" alt="" width="20" height="20" />
            </button>
          </div>
        )}
      </section>
      <Navbar />
    </>
  )
}

function ChatRoomEntry() {
  const router = useRouter()
  const { chatRoomId } = useParams<{ chatRoomId: string }>()
  const searchParams = useSearchParams()
  const direction = searchParams.get('direction')

  useEffect(() => {
    if (direction !== 'SENT' && direction !== 'RECEIVED') {
      router.replace('/pages/chat')
    }
  }, [direction, router])

  if (direction !== 'SENT' && direction !== 'RECEIVED') return null

  return <ChatRoomContent key={chatRoomId} direction={direction} />
}

export default function ChatRoomPage() {
  return (
    <Suspense fallback={<p>채팅방을 불러오는 중입니다.</p>}>
      <ChatRoomEntry />
    </Suspense>
  )
}
