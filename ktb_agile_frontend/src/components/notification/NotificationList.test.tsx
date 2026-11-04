import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NotificationList from './NotificationList'

const router = { replace: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://127.0.0.1:8080' }))

function page(ids: number[], nextCursor: string | null = null) {
  return {
    data: {
      data: {
        notifications: ids.map((notificationId) => ({
          notificationId,
          text: `알림 내용 ${notificationId}`,
          createdAt: '2026-11-02T09:30:00',
        })),
        nextCursor,
        hasNext: nextCursor !== null,
      },
      error: null,
    },
  }
}

const clients: QueryClient[] = []
function renderList() {
  const client = new QueryClient()
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <NotificationList />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(Date, 'now').mockReturnValue(
    new Date('2026-11-02T10:30:00+09:00').getTime(),
  )
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

it('인증된 GET으로 조회하고 각 알림의 문구와 상대 시간을 표시한다', async () => {
  const get = vi.spyOn(axios, 'get').mockResolvedValue(page([102, 101]))
  renderList()
  await screen.findByText('알림 내용 102')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  const times = screen.getAllByText('1시간 전')
  expect(times).toHaveLength(2)
  expect(times[0].getAttribute('datetime')).toBe('2026-11-02T09:30:00')
  expect(screen.queryByText('읽지 않음')).toBeNull()
  expect(get).toHaveBeenCalledWith(
    'http://127.0.0.1:8080/users/me/notifications',
    expect.objectContaining({
      params: { size: 10 },
      headers: {
        Authorization: 'Bearer test-token',
        Accept: 'application/json',
      },
    }),
  )
})

it('opaque 커서로 더 불러오고 ID가 중복된 알림은 한 번만 표시한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([103, 102], 'opaque+/='))
    .mockResolvedValueOnce(page([102, 101]))
  renderList()
  fireEvent.click(await screen.findByRole('button', { name: '더 보기' }))
  await screen.findByText('알림 내용 101')
  expect(get.mock.calls[1][1]?.params).toEqual({
    size: 10,
    cursor: 'opaque+/=',
  })
  expect(screen.getAllByRole('listitem')).toHaveLength(3)
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
})

it('빈 목록에는 빈 상태 안내를 표시한다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue(page([]))
  renderList()
  await screen.findByText('아직 알림이 없습니다.')
  expect(screen.queryByRole('list')).toBeNull()
})

it('네트워크 오류는 별도의 오류 컨테이너 없이 헬퍼텍스트만 표시한다', async () => {
  vi.spyOn(axios, 'get').mockRejectedValue(
    new axios.AxiosError('Network Error'),
  )
  renderList()
  const helper = await screen.findByRole('alert')
  expect(helper.tagName).toBe('P')
  expect(helper.textContent).toBe(
    '알림을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.',
  )
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.queryByText('아직 알림이 없습니다.')).toBeNull()
})

it('추가 조회 오류에도 기존 목록을 유지하고 API 오류 메시지를 표시한다', async () => {
  vi.spyOn(axios, 'get')
    .mockResolvedValueOnce(page([101], 'next'))
    .mockResolvedValueOnce({
      data: { data: null, error: { message: 'cursor가 올바르지 않습니다.' } },
    })
  renderList()
  fireEvent.click(await screen.findByRole('button', { name: '더 보기' }))
  expect((await screen.findByRole('alert')).textContent).toBe(
    'cursor가 올바르지 않습니다.',
  )
  expect(screen.getByText('알림 내용 101')).toBeDefined()
})

it('목록을 다시 열면 GET으로 새 알림을 조회한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(page([101]))
    .mockResolvedValueOnce(page([102]))
  const first = renderList()
  await screen.findByText('알림 내용 101')
  first.unmount()
  renderList()
  await screen.findByText('알림 내용 102')
  expect(get).toHaveBeenCalledTimes(2)
})
