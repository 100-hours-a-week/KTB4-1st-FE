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

const router = { replace: vi.fn(), push: vi.fn() }
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
  offeredItem: {
    itemId: id + 100,
    title: `제시 물품 ${id}`,
    thumbnailImageUrl: `https://example.com/offered-${id}.png`,
  },
  offeredItemCount: 3,
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
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
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
  vi.useRealTimers()
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

it('응답의 제시 물품 썸네일과 추가 물품 개수를 채팅 목록 카드에 표시한다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue(page([room(1)]))
  render(<Chat />)

  expect(
    await screen.findByRole('button', {
      name: '민지님과 물품 1 ↔ 제시 물품 1 외 2개 채팅방 열기',
    }),
  ).toBeDefined()
  expect(screen.getByText('+2')).toBeDefined()
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

async function pullList() {
  const list = screen.getByRole('heading', { name: '대화 목록' }).parentElement!
  fireEvent.touchStart(list, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchMove(list, { touches: [{ clientX: 100, clientY: 300 }] })
  await act(async () => fireEvent.touchEnd(list))
  return list
}

it('당겨서 새로고침하면 현재 탭의 첫 페이지로 교체하고 새 커서부터 추가 조회한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)]))
    .mockResolvedValueOnce(page([room(2)], 'old-next'))
    .mockResolvedValueOnce(page([room(3)]))
    .mockResolvedValueOnce(page([room(4)], 'new-next'))
    .mockResolvedValueOnce(page([room(5)]))
  render(<Chat />)
  await screen.findByText('물품 1')
  fireEvent.click(screen.getByText('받은 교환'))
  await screen.findByText('물품 2')
  intersect()
  await screen.findByText('물품 3')
  vi.useFakeTimers()
  const list = await pullList()
  expect(get.mock.calls[3][1]?.params).toEqual({
    size: 20,
    direction: 'RECEIVED',
  })
  expect(screen.queryByText('물품 2')).toBeNull()
  expect(screen.queryByText('물품 3')).toBeNull()
  expect(screen.getByText('물품 4')).toBeDefined()
  expect(list.style.transform).toBe('translateY(64px)')
  await act(async () => vi.advanceTimersByTime(800))
  expect(list.style.transform).toBe('translateY(0px)')
  await act(async () => intersect())
  expect(get.mock.calls[4][1]?.params).toEqual({
    size: 20,
    direction: 'RECEIVED',
    cursor: 'new-next',
  })
  expect(screen.getByText('물품 5')).toBeDefined()
})

it('새로고침 실패 시 기존 목록을 유지하고 첫 페이지를 다시 시도한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)], 'next'))
    .mockRejectedValueOnce(new Error('새로고침 실패'))
    .mockResolvedValueOnce(page([room(2)]))
  render(<Chat />)
  await screen.findByText('물품 1')
  vi.useFakeTimers()
  await pullList()
  expect(screen.getByText('물품 1')).toBeDefined()
  expect(screen.getByText('새로고침 실패')).toBeDefined()
  expect(screen.getByText('다시 시도').hasAttribute('disabled')).toBe(true)
  await act(async () => vi.advanceTimersByTime(800))
  await act(async () => fireEvent.click(screen.getByText('다시 시도')))
  expect(get.mock.calls[2][1]?.params).toEqual({ size: 20 })
  expect(screen.getByText('물품 2')).toBeDefined()
  expect(screen.queryByText('물품 1')).toBeNull()
})

it('새로고침 중 중복 당김과 추가 조회를 막고 탭 변경 시 요청을 취소한다', async () => {
  let resolveRefresh!: (value: ReturnType<typeof page>) => void
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([room(1)], 'next'))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )
    .mockResolvedValueOnce(page([room(2)]))
  render(<Chat />)
  await screen.findByText('물품 1')
  vi.useFakeTimers()
  await pullList()
  const signal = get.mock.calls[1][1]?.signal
  await pullList()
  intersect(0)
  expect(get).toHaveBeenCalledTimes(2)
  await act(async () => fireEvent.click(screen.getByText('받은 교환')))
  expect(signal?.aborted).toBe(true)
  await act(async () => resolveRefresh(page([room(3)], 'stale-next')))
  expect(screen.getByText('물품 2')).toBeDefined()
  expect(screen.queryByText('물품 3')).toBeNull()
})

it('채팅 카드를 마우스로 당기면 새로고침하고 클릭 이동을 막으며 휠에는 탄성을 적용하지 않는다', async () => {
  const get = vi.spyOn(axios, 'get').mockResolvedValue(page([room(1)]))
  render(<Chat />)
  const card = await screen.findByRole('button', { name: /채팅방 열기/ })
  const list = screen.getByRole('heading', { name: '대화 목록' }).parentElement!
  fireEvent.wheel(list, { deltaY: -100 })
  expect(list.style.transform).toBe('')
  vi.useFakeTimers()
  fireEvent.mouseDown(card, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 300 })
  await act(async () => fireEvent.mouseUp(document))
  expect(get).toHaveBeenCalledTimes(2)
  expect(fireEvent.click(card)).toBe(false)
  expect(router.push).not.toHaveBeenCalled()
  await act(async () => vi.advanceTimersByTime(800))
  fireEvent.click(card)
  expect(router.push).toHaveBeenCalledTimes(1)
})
