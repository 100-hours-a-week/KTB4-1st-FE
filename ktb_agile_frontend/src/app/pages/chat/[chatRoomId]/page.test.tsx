import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ChatRoomDetail } from '@/types/chatRoom'
import ChatRoomPage from './page'

const router = { replace: vi.fn(), push: vi.fn() }
let params: URLSearchParams
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ chatRoomId: '22' }),
  useSearchParams: () => params,
}))
vi.mock('@/config/api', () => ({ API_BASE_URL: '/api' }))
vi.mock('@/hooks/useChatRoomSocket', () => ({
  useChatRoomSocket: () => ({ isConnected: false, sendMessage: vi.fn() }),
}))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))

function detail(): ChatRoomDetail {
  return {
    chatRoomId: 22,
    chatRoomStatus: 'OPEN',
    exchangeRequest: {
      exchangeRequestId: 50,
      exchangeStatus: 'PENDING',
      requestedItem: {
        itemId: 101,
        title: '캠핑 의자',
        availableQuantity: 2,
        thumbnailImageUrl: null,
      },
      requestedQuantity: 2,
      offeredItems: [
        {
          itemId: 202,
          title: '랜턴',
          offeredQuantity: 1,
          availableQuantity: 1,
          thumbnailImageUrl: null,
        },
        {
          itemId: 203,
          title: '텐트',
          offeredQuantity: 2,
          availableQuantity: 3,
          thumbnailImageUrl: null,
        },
      ],
    },
  }
}
function mockResponses(value: ChatRoomDetail) {
  return vi.spyOn(axios, 'get').mockImplementation(async (url) => {
    if (url === '/api/chat-rooms/22')
      return { data: { data: value, error: null } }
    return {
      data: {
        data: { messages: [], nextCursor: null, hasNext: false },
        error: null,
      },
    }
  })
}
beforeEach(() => {
  window.sessionStorage.setItem('accessToken', 'access-token')
  params = new URLSearchParams({
    direction: 'RECEIVED',
    status: 'PENDING',
    title: '오래된 제목',
    itemId: '999',
    exchangeRequestId: '999',
    group: '동네 모임',
    user: '민지',
  })
})
afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('상세 API의 물품·수량과 목록의 그룹·상대방을 표시하고 최신 요청 ID로 완료한다', async () => {
  const get = mockResponses(detail())
  const patch = vi.spyOn(axios, 'patch').mockResolvedValue({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  expect(screen.queryByText(/오래된 제목/)).toBeNull()
  expect(screen.getByText('그룹: 동네 모임')).toBeDefined()
  expect(screen.getByText('상대: 민지')).toBeDefined()
  expect(screen.getByText('요청 수량: 2개 / 재고: 2개')).toBeDefined()
  expect(screen.getByText('랜턴 · 1개 / 재고: 1개')).toBeDefined()
  expect(screen.getByText('텐트 · 2개 / 재고: 3개')).toBeDefined()
  expect(get).toHaveBeenCalledWith(
    '/api/chat-rooms/22',
    expect.objectContaining({
      headers: {
        Authorization: 'Bearer access-token',
        Accept: 'application/json',
      },
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: '교환 완료' }))
  await screen.findByText('거래 완료')
  expect(patch).toHaveBeenCalledWith(
    '/api/exchange-requests/50/status',
    { status: 'COMPLETED' },
    expect.anything(),
  )
  expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
})

it.each(['requested', 'offered'])(
  '%s 물품 재고가 부족하면 교환 동작을 막는다',
  async (target) => {
    const value = detail()
    if (target === 'requested')
      value.exchangeRequest.requestedItem.availableQuantity = 1
    else value.exchangeRequest.offeredItems[1].availableQuantity = 1
    mockResponses(value)
    render(<ChatRoomPage />)
    await screen.findByText('재고 부족')
    expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
    expect(screen.queryByRole('button', { name: '교환 거절' })).toBeNull()
  },
)

it.each(['COMPLETED', 'REJECTED', 'CANCELED'] as const)(
  '목록이 PENDING이어도 상세 상태 %s를 우선한다',
  async (status) => {
    const value = detail()
    value.exchangeRequest.exchangeStatus = status
    mockResponses(value)
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    expect(
      screen.getByText(
        {
          COMPLETED: '거래 완료',
          REJECTED: '거래 거절',
          CANCELED: '제안 취소',
        }[status],
      ),
    ).toBeDefined()
    expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
  },
)

it('닫힌 방에서는 재고가 있어도 교환 동작을 막는다', async () => {
  const value = detail()
  value.chatRoomStatus = 'CLOSED'
  mockResponses(value)
  render(<ChatRoomPage />)
  await screen.findByText('채팅 종료')
  expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
})

it('SENT 방향에서는 제안 수정과 취소만 제공한다', async () => {
  params.set('direction', 'SENT')
  mockResponses(detail())
  render(<ChatRoomPage />)
  fireEvent.click(await screen.findByRole('button', { name: '제안 수정' }))
  expect(router.push).toHaveBeenCalledWith(
    expect.stringContaining('itemId=101&exchangeRequestId=50'),
  )
  expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '채팅방 메뉴' }))
  expect(screen.getByRole('button', { name: '제안 취소' })).toBeDefined()
})

it('상세 조회 실패 시 동작을 노출하지 않고 재시도로 복구한다', async () => {
  const get = mockResponses(detail())
  get.mockImplementationOnce(async () => {
    throw new Error('상세 조회 실패')
  })
  render(<ChatRoomPage />)
  await screen.findByText('상세 조회 실패')
  expect(screen.queryByRole('button', { name: '교환 완료' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByText('상품명: 캠핑 의자')
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})
