import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/config/api'

type ChatRoomSocketMessage = {
  messageId: number
  chatRoomId: number
  userId: number
  content: string
  messageType: string
  createdAt: string
}

type UseChatRoomSocketOptions = {
  chatRoomId: string
  enabled?: boolean
  onMessage: (message: ChatRoomSocketMessage) => void
  onError?: (message: string) => void
}

function getWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '')

  if (API_BASE_URL.startsWith('http')) {
    return API_BASE_URL.replace(/^http/, 'ws')
  }

  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useChatRoomSocket({
  chatRoomId,
  enabled = true,
  onMessage,
  onError,
}: UseChatRoomSocketOptions) {
  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onError, onMessage])

  useEffect(() => {
    if (!enabled) return

    const token = window.sessionStorage.getItem('accessToken')
    const roomId = Number(chatRoomId)
    if (!token || !Number.isSafeInteger(roomId) || roomId < 1) return

    const client = new Client({
      brokerURL: `${getWebSocketUrl()}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setIsConnected(true)
        subscriptionRef.current = client.subscribe(
          `/topic/chat/rooms/${roomId}`,
          (frame: IMessage) => {
            try {
              onMessageRef.current(
                JSON.parse(frame.body) as ChatRoomSocketMessage,
              )
            } catch {
              onErrorRef.current?.('수신한 메시지를 처리하지 못했습니다.')
            }
          },
        )
      },
      onDisconnect: () => setIsConnected(false),
      onWebSocketClose: () => setIsConnected(false),
      onWebSocketError: () => {
        setIsConnected(false)
        onErrorRef.current?.('채팅 서버에 연결할 수 없습니다.')
      },
      onStompError: (frame) => {
        setIsConnected(false)
        onErrorRef.current?.(
          frame.headers.message || '채팅 연결이 거부되었습니다.',
        )
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
      clientRef.current = null
      setIsConnected(false)
      void client.deactivate()
    }
  }, [chatRoomId, enabled])

  function sendMessage(content: string) {
    const client = clientRef.current
    if (!client?.connected) return false

    client.publish({
      destination: `/app/chat/rooms/${chatRoomId}/messages`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    return true
  }

  return { isConnected, sendMessage }
}

export type { ChatRoomSocketMessage }
