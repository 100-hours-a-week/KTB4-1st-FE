import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AiSmartSearchPage from './AiSmartSearchPage'

const router = { back: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/config/api', () => ({}))

const item = {
  itemId: 101,
  groups: [{ groupId: 1, groupName: '우리 동네' }],
  title: '아이폰 충전기',
  contentPreview: '사용하지 않는 물품입니다.',
  quantity: 2,
  itemState: 'AVAILABLE',
  thumbnailImageUrl: null,
  likeCount: 3,
  exchangeRequestCount: 0,
  isLiked: false,
  createdAt: '2026-10-13T10:30:00',
}

beforeEach(() => window.sessionStorage.setItem('accessToken', 'access-token'))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('물품과 조건을 보내고 현재 페이지에서 결과를 받는다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: { items: [item], nextCursor: null, hasNext: false },
      error: null,
    },
  })
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [{ itemId: 202 }] }, error: null },
  })

  render(<AiSmartSearchPage />)

  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.change(
    screen.getByPlaceholderText('예) 과자 물 칫솔 등과 바꾸고 싶어'),
    {
      target: { value: ' 야식으로 먹을 거 찾아요 ' },
    },
  )
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  expect(post).toHaveBeenCalledWith(
    '/bff/smart-search',
    {
      groupId: 1,
      items: [{ itemId: 101, quantity: 1 }],
      preferenceText: '야식으로 먹을 거 찾아요',
    },
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  expect(await screen.findByRole('status')).toHaveProperty(
    'textContent',
    '검색 결과 1건을 가져왔습니다.',
  )
})

it('검색 실패 시 서버 메시지를 모달로 표시하고 확인하면 닫는다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: { items: [item], nextCursor: null, hasNext: false },
      error: null,
    },
  })
  vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      data: null,
      error: {
        code: 'AI_SMART_SEARCH_FAILED',
        message: 'AI 검색 실패',
        details: [],
      },
    },
  })

  render(<AiSmartSearchPage />)
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  expect(await screen.findByText('AI 검색 실패')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  await waitFor(() => expect(screen.queryByText('AI 검색 실패')).toBeNull())
})

it('인증 오류는 검색 오류 모달로 표시하지 않는다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: { items: [item], nextCursor: null, hasNext: false },
      error: null,
    },
  })
  vi.spyOn(axios, 'post').mockRejectedValue({
    isAxiosError: true,
    response: { status: 401 },
  })

  render(<AiSmartSearchPage />)
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  await waitFor(() =>
    expect(screen.getByRole('button', { name: '검색하기' })).not.toHaveProperty(
      'disabled',
      true,
    ),
  )
  expect(screen.queryByRole('button', { name: '확인' })).toBeNull()
})

it('검색 직전에 토큰이 없어져도 BFF 요청의 401 처리에 맡긴다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: { items: [item], nextCursor: null, hasNext: false },
      error: null,
    },
  })
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [] }, error: null },
  })

  render(<AiSmartSearchPage />)
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  window.sessionStorage.removeItem('accessToken')
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  expect(post.mock.calls[0][2]).toEqual({
    headers: { Accept: 'application/json' },
  })
  expect(router.replace).not.toHaveBeenCalled()
})

it('선택한 물품들의 공통 그룹으로 검색한다', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: {
        items: [
          {
            ...item,
            groups: [
              { groupId: 1, groupName: '우리 동네' },
              { groupId: 2, groupName: '친구들' },
            ],
          },
          {
            ...item,
            itemId: 102,
            title: '캠핑 랜턴',
            groups: [{ groupId: 2, groupName: '친구들' }],
          },
        ],
        nextCursor: null,
        hasNext: false,
      },
      error: null,
    },
  })
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [] }, error: null },
  })

  render(<AiSmartSearchPage />)
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.click(screen.getByRole('checkbox', { name: /캠핑 랜턴/ }))
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  expect(post.mock.calls[0][1]).toMatchObject({
    groupId: 2,
    items: [
      { itemId: 101, quantity: 1 },
      { itemId: 102, quantity: 1 },
    ],
  })
})
