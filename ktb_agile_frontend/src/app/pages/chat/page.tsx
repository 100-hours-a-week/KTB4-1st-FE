'use client'

import axios from 'axios'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import ChatRoomCard, { type ChatRoom } from '@/components/chat/ChatRoomCard'
import { API_BASE_URL } from '@/config/api'
import styles from './page.module.css'

type Direction = 'SENT' | 'RECEIVED'
type Tab = 'ALL' | Direction
type ChatRoomResponse = {
  data: { chatRooms: ChatRoom[]; nextCursor: string | null; hasNext: boolean }
  error: { code: string; message: string } | null
}
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
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    const controller = new AbortController()
    async function load() {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const response = await axios.get<ChatRoomResponse>(
          `${API_BASE_URL}/chat-rooms`,
          {
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
          },
        )
        if (response.data.error || !response.data.data) {
          throw new Error(
            response.data.error?.message || '채팅 목록을 불러오지 못했습니다.',
          )
        }
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
        setHasNext(page.hasNext)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(
          error instanceof Error && !axios.isAxiosError(error)
            ? error.message
            : '채팅 목록을 불러오지 못했습니다. 다시 시도해주세요.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [tab, cursor, retryCount, router])

  function selectTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    setRooms([])
    setCursor(null)
    setNextCursor(null)
    setHasNext(false)
    setIsLoading(true)
    setErrorMessage(null)
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
                <ChatRoomCard key={room.chatRoomId} room={room} />
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
          {!isLoading && !errorMessage && hasNext && nextCursor && (
            <button
              type="button"
              className={styles.more}
              onClick={() => setCursor(nextCursor)}
            >
              더 보기
            </button>
          )}
        </div>
      </section>
      <Navbar />
    </>
  )
}
