import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ChatRoom } from '@/types/chatRoom'
import Chat from './page'

const router = { replace: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/config/api', () => ({}))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))
vi.mock('@/components/common/chatbot/ChatbotButton', () => ({
  default: () => null,
}))
vi.mock('@/components/common/inquiry/FloatingInquiryButton', () => ({
  default: () => null,
}))

const observers: {
  callback: IntersectionObserverCallback
  disconnect: ReturnType<typeof vi.fn>
}[] = []
const room = (id: number): ChatRoom => ({
  chatRoomId: id,
  chatRoomStatus: 'OPEN',
  exchangeRequestId: id,
  exchangeStatus: 'PENDING',
  direction: 'SENT',
  group: null,
  otherUser: {
    userId: 9,
    nickname: '민지',
    profileImageUrl: null,
    userStatus: 'ACTIVE',
    groupMemberStatus: 'ACTIVE',
  },
  targetItem: { itemId: id, title: `물품 ${id}`, thumbnailImageUrl: null },
  lastMessage: {
    messageId: id,
    content: '교환 요청이 접수되었습니다.',
    senderId: null,
    createdAt: '2026-10-16T10:08:00',
  },
  unreadMessageCount: 1,
  lastMessageAt: '2026-10-16T10:08:00',
})
const page = (
  rooms: ChatRoom[],
  nextCursor: string | null = null,
  hasNext = Boolean(nextCursor),
) => ({
  data: { data: { chatRooms: rooms, nextCursor, hasNext }, error: null },
})
function intersect(index = observers.length - 1, isIntersecting = true) {
  act(() =>
    observers[index].callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  )
}

beforeEach(() => {
  window.sessionStorage.setItem('accessToken', 'access-token')
  observers.length = 0
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect })
      }
    },
  )
})
afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('새 문서의 null 그룹과 시스템 메시지를 표시하고 하단 도달 전에는 추가 요청하지 않는다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValue(page([room(1)], 'opaque+/='))
  render(<Chat />)
  await screen.findByText('물품 1')
  await waitFor(() => expect(observers).toHaveLength(1))
  expect(screen.getByText('교환 요청이 접수되었습니다.')).toBeDefined()
  expect(screen.queryByText(/\(나\)/)).toBeNull()
  intersect(0, false)
  expect(get).toHaveBeenCalledTimes(1)
  expect(get).toHaveBeenCalledWith(
    '/bff/chat-rooms',
    expect.objectContaining({ params: { size: 20 } }),
  )
})

it('하단에서 커서를 그대로 전달하고 중복 관찰과 중복 방을 처리한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)], 'opaque+/='))
    .mockResolvedValueOnce(page([room(1), room(2)]))
  render(<Chat />)
  await waitFor(() => expect(observers).toHaveLength(1))
  intersect()
  intersect()
  await screen.findByText('물품 2')
  expect(get).toHaveBeenCalledTimes(2)
  expect(get.mock.calls[1][1]?.params).toEqual({
    size: 20,
    cursor: 'opaque+/=',
  })
  expect(screen.getAllByText('물품 1')).toHaveLength(1)
  intersect(0)
  expect(get).toHaveBeenCalledTimes(2)
})

it('nextCursor가 없으면 hasNext가 true여도 추가 조회를 관찰하지 않는다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValue(page([room(1)], null, true))
  render(<Chat />)
  await screen.findByText('물품 1')
  expect(observers).toHaveLength(0)
  expect(get).toHaveBeenCalledTimes(1)
})

it('필터를 다음 페이지에도 유지하고 탭 변경 시 커서를 초기화한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)]))
    .mockResolvedValueOnce(page([room(2)], 'received-next'))
    .mockResolvedValueOnce(page([room(3)]))
    .mockResolvedValueOnce(page([room(4)]))
  render(<Chat />)
  await screen.findByText('물품 1')
  fireEvent.click(screen.getByText('받은 교환'))
  await waitFor(() => expect(observers).toHaveLength(1))
  intersect()
  await screen.findByText('물품 3')
  expect(get.mock.calls[2][1]?.params).toEqual({
    size: 20,
    direction: 'RECEIVED',
    cursor: 'received-next',
  })
  fireEvent.click(screen.getByText('보낸 교환'))
  await screen.findByText('물품 4')
  expect(get.mock.calls[3][1]?.params).toEqual({ size: 20, direction: 'SENT' })
  expect(screen.queryByText('물품 2')).toBeNull()
})

it('추가 조회 실패 시 목록을 보존하고 다시 시도하면 같은 커서로 재요청한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)], 'next'))
    .mockRejectedValueOnce(new Error('조회 실패'))
    .mockResolvedValueOnce(page([room(2)]))
  render(<Chat />)
  await waitFor(() => expect(observers).toHaveLength(1))
  intersect()
  await screen.findByText('조회 실패')
  expect(screen.getByText('물품 1')).toBeDefined()
  expect(get).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByText('다시 시도'))
  await screen.findByText('물품 2')
  expect(get.mock.calls[2][1]?.params).toEqual({ size: 20, cursor: 'next' })
})

it('탭 변경 전에 시작한 늦은 응답은 새 목록에 섞이지 않는다', async () => {
  let resolveOld!: (value: ReturnType<typeof page>) => void
  vi.spyOn(axios, 'get')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    .mockResolvedValueOnce(page([room(2)]))
  render(<Chat />)
  fireEvent.click(screen.getByText('받은 교환'))
  await screen.findByText('물품 2')
  await act(async () => resolveOld(page([room(1)], 'old-next')))
  expect(screen.queryByText('물품 1')).toBeNull()
  expect(observers).toHaveLength(0)
})
