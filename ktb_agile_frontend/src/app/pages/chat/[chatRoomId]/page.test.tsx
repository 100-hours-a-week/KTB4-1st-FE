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
import type { ChatRoomDetail } from '@/types/chatRoom'
import type { ChatMessageDto } from '@/types/chatMessage'
import type { useChatRoomSocket } from '@/hooks/useChatRoomSocket'
import ChatRoomPage from './page'

const router = { replace: vi.fn(), push: vi.fn() }
const useChatRoomSocketMock = vi.hoisted(() =>
  vi.fn<typeof useChatRoomSocket>(() => ({
    isConnected: false,
    sendMessage: vi.fn(() => false),
  })),
)
let params: URLSearchParams
let roomId = '22'
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ chatRoomId: roomId }),
  useSearchParams: () => params,
}))
vi.mock('@/config/api', () => ({ API_BASE_URL: '/api' }))
vi.mock('@/hooks/useChatRoomSocket', () => ({
  useChatRoomSocket: useChatRoomSocketMock,
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
    if (url === '/bff/chat-rooms/22')
      return { data: { data: value, error: null } }
    return {
      data: {
        data: { messages: [], nextCursor: null, hasNext: false },
        error: null,
      },
    }
  })
}
const originalScrollTo = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollTo',
)
beforeEach(() => {
  roomId = '22'
  useChatRoomSocketMock.mockReturnValue({
    isConnected: false,
    sendMessage: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
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
  if (originalScrollTo)
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo)
  else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
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
    '/bff/chat-rooms/22',
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

it('메시지 이력을 BFF로 조회하고 SYSTEM 본문을 일반 말풍선과 구분한다', async () => {
  const get = vi.spyOn(axios, 'get').mockImplementation(async (url) => {
    if (url === '/bff/chat-rooms/22')
      return { data: { data: detail(), error: null } }
    return {
      data: {
        data: {
          messages: [
            {
              messageId: 101,
              chatRoomId: 22,
              userId: null,
              messageType: 'SYSTEM',
              content: '교환 요청이 접수되었습니다.',
              createdAt: '2026-10-16T10:07:00',
              userStatus: null,
              groupMemberStatus: null,
              payload: null,
            },
            {
              messageId: 102,
              chatRoomId: 22,
              userId: 9,
              messageType: 'TEXT',
              content: '네, 가능합니다.',
              createdAt: '2026-10-16T10:08:00',
              userStatus: 'ACTIVE',
              groupMemberStatus: 'ACTIVE',
              payload: null,
            },
          ],
          nextCursor: null,
          hasNext: false,
        },
        error: null,
      },
    }
  })
  render(<ChatRoomPage />)
  const system = await screen.findByText('교환 요청이 접수되었습니다.')
  expect(system.className).toContain('systemContent')
  expect(system.parentElement?.className).toContain('system')
  expect(system.parentElement?.querySelector('time')).toBeNull()
  expect(system.parentElement?.querySelector('[aria-hidden]')).toBeNull()
  expect(screen.getByText('네, 가능합니다.').className).toContain('bubble')
  expect(get).toHaveBeenCalledWith(
    '/bff/chat/rooms/22/messages',
    expect.objectContaining({
      headers: {
        Authorization: 'Bearer access-token',
        Accept: 'application/json',
      },
    }),
  )
})

it('이전 메시지도 BFF로 같은 커서를 전달하고 중복 없이 앞에 추가한다', async () => {
  const message = (id: number, content: string) => ({
    messageId: id,
    chatRoomId: 22,
    userId: null,
    messageType: 'SYSTEM',
    content,
    createdAt: '2026-10-16T10:07:00',
    userStatus: null,
    groupMemberStatus: null,
    payload: null,
  })
  const get = vi.spyOn(axios, 'get').mockImplementation(async (url, config) => {
    if (url === '/bff/chat-rooms/22')
      return { data: { data: detail(), error: null } }
    const older = Boolean(
      (config?.params as { cursor?: string } | undefined)?.cursor,
    )
    return {
      data: {
        data: {
          messages: older
            ? [message(100, '이전 안내'), message(101, '최신 안내')]
            : [message(101, '최신 안내')],
          nextCursor: older ? null : 'opaque+/=',
          hasNext: !older,
        },
        error: null,
      },
    }
  })
  render(<ChatRoomPage />)
  fireEvent.click(
    await screen.findByRole('button', { name: '이전 메시지 보기' }),
  )
  await screen.findByText('이전 안내')
  expect(get).toHaveBeenCalledWith(
    '/bff/chat/rooms/22/messages',
    expect.objectContaining({ params: { cursor: 'opaque+/=' } }),
  )
  expect(screen.getAllByText('최신 안내')).toHaveLength(1)
  expect(
    screen
      .getByText('이전 안내')
      .compareDocumentPosition(screen.getByText('최신 안내')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(screen.queryByRole('button', { name: '이전 메시지 보기' })).toBeNull()
})

it.each([null, '', 'UNKNOWN', 'sent'])(
  'direction이 %s이면 채팅방을 실행하지 않고 목록으로 이동한다',
  async (direction) => {
    if (direction === null) params.delete('direction')
    else params.set('direction', direction)
    const get = vi.spyOn(axios, 'get')
    render(<ChatRoomPage />)
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/pages/chat'),
    )
    expect(screen.queryByRole('region', { name: '채팅방' })).toBeNull()
    expect(get).not.toHaveBeenCalled()
    expect(useChatRoomSocketMock).not.toHaveBeenCalled()
  },
)

it.each(['SENT', 'RECEIVED'])(
  'direction이 %s이면 직접 진입해도 채팅방을 연다',
  async (direction) => {
    params.set('direction', direction)
    const get = mockResponses(detail())
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    expect(router.replace).not.toHaveBeenCalled()
    expect(get).toHaveBeenCalled()
    expect(useChatRoomSocketMock).toHaveBeenCalled()
  },
)

function historyMessage(id: number, content: string): ChatMessageDto {
  return {
    messageId: id,
    chatRoomId: 22,
    userId: 9,
    messageType: 'TEXT',
    content,
    createdAt: '2026-10-17T10:08:00',
    userStatus: 'ACTIVE',
    groupMemberStatus: 'ACTIVE',
    payload: null,
  }
}
function messageResponse(
  messages: ChatMessageDto[],
  nextCursor: string | null = null,
) {
  return {
    data: {
      data: { messages, nextCursor, hasNext: nextCursor !== null },
      error: null,
    },
  }
}
function receive(message: ChatMessageDto) {
  act(() => useChatRoomSocketMock.mock.lastCall![0].onMessage(message))
}

it('이력이 늦게 도착해도 실시간 메시지를 보존하고 ID 중복 제거·정렬 후 입력을 허용한다', async () => {
  const send = vi.fn(() => true)
  useChatRoomSocketMock.mockReturnValue({
    isConnected: true,
    sendMessage: send,
  })
  let resolveHistory!: (value: ReturnType<typeof messageResponse>) => void
  vi.spyOn(axios, 'get').mockImplementation(async (url) => {
    if (url === '/bff/chat-rooms/22')
      return { data: { data: detail(), error: null } }
    return new Promise((resolve) => {
      resolveHistory = resolve
    })
  })
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  const input = screen.getByLabelText('메시지') as HTMLInputElement
  expect(input.disabled).toBe(true)
  expect(input.placeholder).toBe('메시지를 불러오는 중입니다.')
  expect(
    (screen.getByRole('button', { name: '메시지 보내기' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  fireEvent.keyUp(input, { key: 'Enter', target: { value: '대기 중 전송' } })
  expect(send).not.toHaveBeenCalled()
  receive(historyMessage(104, '메시지 104'))
  receive(historyMessage(103, '메시지 103'))
  receive(historyMessage(103, '메시지 103'))
  await act(async () =>
    resolveHistory(
      messageResponse([
        historyMessage(101, '메시지 101'),
        historyMessage(103, '메시지 103'),
      ]),
    ),
  )
  expect(screen.getAllByText('메시지 103')).toHaveLength(1)
  expect(
    screen.getAllByText(/^메시지 10/).map((node) => node.textContent),
  ).toEqual(['메시지 101', '메시지 103', '메시지 104'])
  expect(input.disabled).toBe(false)
  fireEvent.change(input, { target: { value: '전송 가능' } })
  fireEvent.click(screen.getByRole('button', { name: '메시지 보내기' }))
  expect(send).toHaveBeenCalledWith('전송 가능')
})

it('첫 이력 조회 실패 후 실시간 메시지가 있어도 재시도할 수 있고 성공 전까지 전송을 막는다', async () => {
  useChatRoomSocketMock.mockReturnValue({
    isConnected: true,
    sendMessage: vi.fn(),
  })
  let rejectHistory!: (cause: Error) => void
  let requested = false
  vi.spyOn(axios, 'get').mockImplementation(async (url) => {
    if (url === '/bff/chat-rooms/22')
      return { data: { data: detail(), error: null } }
    if (!requested) {
      requested = true
      return new Promise((_resolve, reject) => {
        rejectHistory = reject
      })
    }
    return messageResponse([historyMessage(100, '기존 이력')])
  })
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  receive(historyMessage(101, '실시간 메시지'))
  await act(async () => rejectHistory(new Error('이력 조회 실패')))
  expect((screen.getByLabelText('메시지') as HTMLInputElement).disabled).toBe(
    true,
  )
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await screen.findByText('기존 이력')
  expect(screen.getByText('실시간 메시지')).toBeDefined()
  expect((screen.getByLabelText('메시지') as HTMLInputElement).disabled).toBe(
    false,
  )
})

it('다른 방으로 이동하면 이전 방의 메시지를 새 이력에 합치지 않는다', async () => {
  vi.spyOn(axios, 'get').mockImplementation(async (url) => {
    if (url === `/bff/chat-rooms/${roomId}`)
      return {
        data: {
          data: { ...detail(), chatRoomId: Number(roomId) },
          error: null,
        },
      }
    return messageResponse([
      historyMessage(Number(roomId), `방 ${roomId} 메시지`),
    ])
  })
  const { rerender } = render(<ChatRoomPage />)
  await screen.findByText('방 22 메시지')
  roomId = '23'
  rerender(<ChatRoomPage />)
  await screen.findByText('방 23 메시지')
  expect(screen.queryByText('방 22 메시지')).toBeNull()
})

it.each(['CLOSED', 'REJECTED', 'CANCELED', 'COMPLETED'] as const)(
  '%s 상태로 입장하면 종료된 대화의 입력창과 전송 버튼을 숨긴다',
  async (status) => {
    const value = detail()
    if (status === 'CLOSED') value.chatRoomStatus = status
    else value.exchangeRequest.exchangeStatus = status
    mockResponses(value)
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    const remainsOpen = status === 'COMPLETED'
    expect(screen.queryByLabelText('메시지') !== null).toBe(remainsOpen)
    expect(
      screen.queryByRole('button', { name: '메시지 보내기' }) !== null,
    ).toBe(remainsOpen)
  },
)

it.each([
  'CHAT_ROOM_MEMBER_LEFT',
  'EXCHANGE_REQUEST_REJECTED',
  'EXCHANGE_REQUEST_CANCELED',
] as const)(
  '%s 알림을 받으면 입력창을 즉시 숨기고 대화는 보존한다',
  async (event) => {
    mockResponses(detail())
    useChatRoomSocketMock.mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(() => true),
    })
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    fireEvent.change(screen.getByLabelText('메시지'), {
      target: { value: '작성 중인 메시지' },
    })
    receive(historyMessage(100, '기존 대화'))
    receive({
      ...historyMessage(101, '대화 종료 안내'),
      userId: null,
      messageType: 'SYSTEM',
      systemEventType: event,
    })
    expect(screen.queryByLabelText('메시지')).toBeNull()
    expect(screen.queryByRole('button', { name: '메시지 보내기' })).toBeNull()
    expect(screen.getByText('기존 대화')).toBeDefined()
    expect(screen.getByText('대화 종료 안내')).toBeDefined()
    expect(screen.getByText('채팅 종료')).toBeDefined()
  },
)

it.each(['REJECTED', 'CANCELED'] as const)(
  '직접 %s 처리하면 소켓 알림 없이도 입력창을 숨긴다',
  async (status) => {
    if (status === 'CANCELED') params.set('direction', 'SENT')
    mockResponses(detail())
    vi.spyOn(axios, 'patch').mockResolvedValue({})
    vi.spyOn(axios, 'delete').mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    expect(screen.getByLabelText('메시지')).toBeDefined()
    if (status === 'CANCELED')
      fireEvent.click(screen.getByRole('button', { name: '채팅방 메뉴' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: status === 'REJECTED' ? '교환 거절' : '제안 취소',
      }),
    )
    await waitFor(() => expect(screen.queryByLabelText('메시지')).toBeNull())
    expect(screen.queryByRole('button', { name: '메시지 보내기' })).toBeNull()
  },
)

it('나가기에 성공하면 화면 이동 전에도 입력창을 숨긴다', async () => {
  params.set('direction', 'SENT')
  mockResponses(detail())
  vi.spyOn(axios, 'delete').mockResolvedValue({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  fireEvent.click(screen.getByRole('button', { name: '채팅방 메뉴' }))
  fireEvent.click(screen.getByRole('button', { name: '채팅방 나가기' }))
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/chat'),
  )
  expect(screen.queryByLabelText('메시지')).toBeNull()
  expect(screen.queryByRole('button', { name: '메시지 보내기' })).toBeNull()
})

function clickLeaveRoom() {
  fireEvent.click(screen.getByRole('button', { name: '채팅방 메뉴' }))
  fireEvent.click(screen.getByRole('button', { name: '채팅방 나가기' }))
}

it('교환 취소 응답을 받은 뒤에만 채팅방 나가기를 요청한다', async () => {
  params.set('direction', 'SENT')
  mockResponses(detail())
  let resolveCancel!: (value: object) => void
  const remove = vi.spyOn(axios, 'delete').mockImplementation(async (url) => {
    if (url === '/api/exchange-requests/50')
      return new Promise((resolve) => {
        resolveCancel = resolve
      })
    return {}
  })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  clickLeaveRoom()
  expect(remove).toHaveBeenCalledTimes(1)
  expect(remove).toHaveBeenNthCalledWith(
    1,
    '/api/exchange-requests/50',
    expect.anything(),
  )
  expect(router.replace).not.toHaveBeenCalled()
  await act(async () => resolveCancel({}))
  expect(remove).toHaveBeenNthCalledWith(
    2,
    '/api/chat-rooms/22/members/me',
    expect.anything(),
  )
  expect(router.replace).toHaveBeenCalledWith('/pages/chat')
})

it.each(['SENT', 'RECEIVED'])(
  '%s 방향에서 교환 취소 실패 시 나가기를 요청하지 않고 재시도를 안내한다',
  async (direction) => {
    params.set('direction', direction)
    mockResponses(detail())
    const remove = vi.spyOn(axios, 'delete').mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: '취소 권한 없음' } } },
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    clickLeaveRoom()
    await screen.findByText(
      '채팅방을 나가지 못했습니다. 잠시 후 다시 시도해 주세요.',
    )
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(
      '/api/exchange-requests/50',
      expect.anything(),
    )
    expect(router.replace).not.toHaveBeenCalled()
    expect(screen.getByLabelText('메시지')).toBeDefined()
    clickLeaveRoom()
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(2))
  },
)

it.each(['COMPLETED', 'REJECTED', 'CANCELED'] as const)(
  '%s 교환은 취소를 요청하지 않고 방만 나간다',
  async (status) => {
    const value = detail()
    value.exchangeRequest.exchangeStatus = status
    mockResponses(value)
    const remove = vi.spyOn(axios, 'delete').mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatRoomPage />)
    await screen.findByText('상품명: 캠핑 의자')
    clickLeaveRoom()
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith('/pages/chat'),
    )
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(
      '/api/chat-rooms/22/members/me',
      expect.anything(),
    )
  },
)

it('취소 후 나가기만 실패하면 안내하고 재시도 시 나가기만 요청한다', async () => {
  params.set('direction', 'SENT')
  mockResponses(detail())
  const remove = vi
    .spyOn(axios, 'delete')
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('나가기 실패'))
    .mockResolvedValueOnce({})
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<ChatRoomPage />)
  await screen.findByText('상품명: 캠핑 의자')
  clickLeaveRoom()
  await screen.findByText(
    '채팅방을 나가지 못했습니다. 잠시 후 다시 시도해 주세요.',
  )
  expect(router.replace).not.toHaveBeenCalled()
  expect(screen.queryByLabelText('메시지')).toBeNull()
  clickLeaveRoom()
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/chat'),
  )
  expect(remove).toHaveBeenCalledTimes(3)
  expect(remove).toHaveBeenNthCalledWith(
    3,
    '/api/chat-rooms/22/members/me',
    expect.anything(),
  )
})
