'use client'

import { CHAT_ROOM_STATUS } from '@/constants/chat'
import { CHAT_ERRORS } from '@/constants/errors/chat'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ChatRoomCard from '@/components/chat/ChatRoomCard'
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
  const [retryCount, setRetryCount] = useState(0)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = getAccessTokenOrRedirect(router)
    if (!token) return
    const controller = new AbortController()
    async function load() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await axios.get<ChatRoomResponse>('/bff/chat-rooms', {
          params: {
            size: 20,
            ...(tab !== 'ALL' ? { direction: tab } : {}),
            ...(cursor ? { cursor } : {}),
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
          cursor
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
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [tab, cursor, retryCount, router])

  useEffect(() => {
    const target = listEndRef.current
    if (
      !target ||
      isLoading ||
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
        requested ||
        !entries.some((entry) => entry.isIntersecting)
      )
        return
      requested = true
      setCursor(nextCursor)
    })
    observer.observe(target)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [isLoading, errorMessage, nextCursor, cursor])

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
        <div className={styles.listSection}>
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
                onClick={() => setRetryCount((count) => count + 1)}
              >
                다시 시도
              </button>
            </div>
          )}
          {!isLoading && !errorMessage && rooms.length === 0 && (
            <p className={styles.state}>채팅방이 없습니다.</p>
          )}
          {!isLoading && !errorMessage && nextCursor && (
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
