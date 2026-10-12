import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SearchPage from './page'

const router = { replace: vi.fn(), back: vi.fn() }
const groups = JSON.stringify([{ groupId: 12, groupName: '우리 동네' }])

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams({ groups, groupId: '12' }),
}))
vi.mock('@/config/api', () => ({}))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))

beforeEach(() => {
  window.sessionStorage.setItem('accessToken', 'access-token')
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('검색 페이지를 열면 검색 기록을 조회해 검색창 아래에 표시한다', async () => {
  const get = vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: {
        searchHistories: [
          { searchHistoryId: 802, keyword: '충전기' },
          { searchHistoryId: 801, keyword: '자전거' },
        ],
        nextCursor: null,
        hasNext: false,
      },
      error: null,
    },
  })

  render(<SearchPage />)

  await waitFor(() => expect(screen.getByText('충전기')).toBeDefined())
  expect(screen.getByText('자전거')).toBeDefined()
  expect(screen.getAllByText('×')).toHaveLength(2)
  expect(get).toHaveBeenCalledWith('/bff/search-histories', {
    headers: {
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    },
    signal: expect.any(AbortSignal),
  })
})

it('검색 기록을 가져오지 못하면 지정된 문구를 붉은 글씨 영역에 표시한다', async () => {
  vi.spyOn(axios, 'get').mockRejectedValue(new Error('network error'))

  render(<SearchPage />)

  const message = await screen.findByText('검색 기록을 가져오는데 실패했습니다')
  expect(message.className).toMatch(/historyError/)
})

it('검색 버튼은 검색 GET만 호출한다', async () => {
  let finishSearch: ((value: unknown) => void) | undefined
  const searchResponse = new Promise((resolve) => {
    finishSearch = resolve
  })
  const get = vi.spyOn(axios, 'get').mockImplementation((url) => {
    if (url === '/bff/search')
      return searchResponse as ReturnType<typeof axios.get>
    return Promise.resolve({
      data: {
        data: { searchHistories: [], nextCursor: null, hasNext: false },
        error: null,
      },
    })
  })
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 201 })

  render(<SearchPage />)
  fireEvent.change(screen.getByPlaceholderText('물품 검색'), {
    target: { value: '충전기' },
  })
  fireEvent.click(screen.getByText('검색'))

  await waitFor(() =>
    expect(get.mock.calls.some(([url]) => url === '/bff/search')).toBe(true),
  )
  expect(post).not.toHaveBeenCalled()

  finishSearch?.({
    data: {
      data: { items: [], nextCursor: null, hasNext: false },
      error: null,
    },
  })

  await screen.findByText('검색 결과가 없습니다.')
  expect(post).not.toHaveBeenCalled()
})

it('x를 누르면 해당 검색 기록만 삭제한다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: {
        searchHistories: [
          { searchHistoryId: 802, keyword: '충전기' },
          { searchHistoryId: 801, keyword: '자전거' },
        ],
        nextCursor: null,
        hasNext: false,
      },
      error: null,
    },
  })
  const remove = vi.spyOn(axios, 'delete').mockResolvedValue({ status: 204 })

  render(<SearchPage />)
  await screen.findByText('충전기')
  fireEvent.click(screen.getAllByText('×')[0])

  await waitFor(() => expect(screen.queryByText('충전기')).toBeNull())
  expect(screen.getByText('자전거')).toBeDefined()
  expect(remove).toHaveBeenCalledWith('/bff/search-histories/802', {
    headers: {
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    },
  })
})

it('삭제 요청이 실패하면 기록을 유지하고 공용 모달을 연다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: {
        searchHistories: [{ searchHistoryId: 802, keyword: '충전기' }],
        nextCursor: null,
        hasNext: false,
      },
      error: null,
    },
  })
  vi.spyOn(axios, 'delete').mockRejectedValue(new Error('server error'))

  render(<SearchPage />)
  await screen.findByText('충전기')
  fireEvent.click(screen.getByText('×'))

  expect(
    await screen.findByText('서버 문제로 검색 기록을 삭제하지 못했습니다.'),
  ).toBeDefined()
  expect(screen.getByText('충전기')).toBeDefined()

  fireEvent.click(screen.getByText('확인'))
  expect(
    screen.queryByText('서버 문제로 검색 기록을 삭제하지 못했습니다.'),
  ).toBeNull()
})
