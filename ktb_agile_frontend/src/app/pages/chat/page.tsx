'use client'

import { CHAT_ROOM_STATUS } from '@/constants/chat'
import { CHAT_ERRORS } from '@/constants/errors/chat'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ChatRoomCard from '@/components/chat/ChatRoomCard'
import Loading from '@/components/common/Loading'
import { useElasticPull } from '@/hooks/useElasticPull'
import type { ChatRoom, ChatRoomResponse } from '@/types/chatRoom'
import '@/config/api'
import styles from './page.module.css'
import { getAccessTokenOrRedirect } from '@/utils/auth'

type Direction = 'SENT' | 'RECEIVED'
type Tab = 'ALL' | Direction
const tabs: { value: Tab; label: string }[] = [
  { value: 'ALL', label: '채팅 목록' },
  { value: 'RECEIVED', label: '받은 교환' },
  { value: 'SENT', label: '보낸 교환' },
]

export default function Chat() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('ALL')
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (requestedCursor: string | null, signal?: AbortSignal) => {
      if (signal?.aborted) return
      const token = getAccessTokenOrRedirect(router)
      if (!token) return
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      const cancel = () => controller.abort()
      signal?.addEventListener('abort', cancel, { once: true })
      try {
        const response = await axios.get<ChatRoomResponse>('/bff/chat-rooms', {
          params: {
            size: 20,
            ...(tab !== 'ALL' ? { direction: tab } : {}),
            ...(requestedCursor ? { cursor: requestedCursor } : {}),
          },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        if (response.data.error || !response.data.data) {
          throw new Error(
            response.data.error?.message || CHAT_ERRORS.ROOM_LIST_LOAD_FAILED,
          )
        }
        if (controller.signal.aborted) return
        const page = response.data.data
        setRooms((current) =>
          requestedCursor
            ? [
                ...current,
                ...page.chatRooms.filter(
                  (room) =>
                    !current.some(
                      (item) => item.chatRoomId === room.chatRoomId,
                    ),
                ),
              ]
            : page.chatRooms,
        )
        setNextCursor(page.nextCursor)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(
          error instanceof Error && !axios.isAxiosError(error)
            ? error.message
            : CHAT_ERRORS.ROOM_LIST_LOAD_RETRY,
        )
      } finally {
        signal?.removeEventListener('abort', cancel)
        if (requestRef.current === controller) requestRef.current = null
        if (!controller.signal.aborted && !signal) setIsLoading(false)
      }
    },
    [tab, router],
  )

  useEffect(() => {
    // load의 상태 갱신은 API 응답 이후에만 실행됩니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(null)
    return () => requestRef.current?.abort()
  }, [load])

  const refreshRooms = useCallback(
    (signal: AbortSignal) => {
      setCursor(null)
      setErrorMessage(null)
      // 기존 목록을 유지하고 새로고침 상태는 훅에서 관리합니다.
      return load(null, signal)
    },
    [load],
  )
  const { contentRef, pullProgress, isRefreshing } = useElasticPull(
    !isLoading,
    refreshRooms,
  )

  useEffect(() => {
    const target = listEndRef.current
    if (
      !target ||
      isLoading ||
      isRefreshing ||
      errorMessage ||
      !nextCursor ||
      nextCursor === cursor
    )
      return

    let active = true
    let requested = false
    const observer = new IntersectionObserver((entries) => {
      if (
        !active ||
        requestRef.current ||
        requested ||
        !entries.some((entry) => entry.isIntersecting)
      )
        return
      requested = true
      setCursor(nextCursor)
      setIsLoading(true)
      setErrorMessage(null)
      void load(nextCursor)
    })
    observer.observe(target)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [isLoading, isRefreshing, errorMessage, nextCursor, cursor, load])

  function selectTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    setRooms([])
    setCursor(null)
    setNextCursor(null)
    setIsLoading(true)
    setErrorMessage(null)
  }

  function openChatRoom(room: ChatRoom) {
    const params = new URLSearchParams({
      title: room.targetItem.title,
      group: room.group?.groupName ?? '',
      user: room.otherUser.nickname,
      direction: room.direction,
      status:
        room.chatRoomStatus === CHAT_ROOM_STATUS.CLOSED
          ? CHAT_ROOM_STATUS.CLOSED
          : room.exchangeStatus,
      itemId: String(room.targetItem.itemId),
      exchangeRequestId: String(room.exchangeRequestId),
    })
    if (room.targetItem.thumbnailImageUrl) {
      params.set('image', room.targetItem.thumbnailImageUrl)
    }
    router.push(`/pages/chat/${room.chatRoomId}?${params.toString()}`)
  }

  return (
    <>
      <section className={styles.page}>
        <header className={styles.tabs}>
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`${styles.tab} ${tab === item.value ? styles.activeTab : ''}`}
              onClick={() => selectTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </header>
        <div ref={contentRef} className={styles.listSection}>
          {(pullProgress > 0 || isRefreshing) && (
            <div className={styles.pullIndicator}>
              <Loading progress={isRefreshing ? undefined : pullProgress} />
            </div>
          )}
          <h1 className={styles.heading}>대화 목록</h1>
          {rooms.length > 0 && (
            <ul className={styles.list}>
              {rooms.map((room) => (
                <ChatRoomCard
                  key={room.chatRoomId}
                  room={room}
                  onClick={() => openChatRoom(room)}
                />
              ))}
            </ul>
          )}
          {isLoading && (
            <p className={styles.state}>채팅 목록을 불러오는 중입니다.</p>
          )}
          {!isLoading && errorMessage && (
            <div className={styles.state}>
              <p>{errorMessage}</p>
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  setIsLoading(true)
                  setErrorMessage(null)
                  void load(cursor)
                }}
                disabled={isRefreshing}
              >
                다시 시도
              </button>
            </div>
          )}
          {!isLoading &&
            !isRefreshing &&
            !errorMessage &&
            rooms.length === 0 && (
              <p className={styles.state}>채팅방이 없습니다.</p>
            )}
          {!isLoading && !isRefreshing && !errorMessage && nextCursor && (
            <div
              ref={listEndRef}
              className={styles.listEnd}
              aria-hidden="true"
            />
          )}
        </div>
      </section>
      <Navbar />
    </>
  )
}
