import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import axios, { type AxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { MyItemListItem } from '@/types/item'
import ExchangeForm from './ExchangeForm'

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/config/api', () => ({ API_BASE_URL: 'http://api.test' }))

const groupA = { groupId: 1, groupName: '판교 그룹' }
const groupB = { groupId: 2, groupName: '서울 그룹' }

const target = {
  itemId: 900,
  groups: [groupA, groupB],
  title: '상대 물품',
  content: '설명',
  quantity: 3,
  itemState: 'AVAILABLE',
  exchangeUrgencyScore: 0,
  valueGapToleranceScore: 0,
  owner: { userId: 2, nickname: '상대', profileImageUrl: null },
  images: [],
  likeCount: 0,
  viewCount: 0,
}

function myItem(
  itemId: number,
  title: string,
  overrides: Partial<MyItemListItem> = {},
): MyItemListItem {
  return {
    itemId,
    title,
    contentPreview: '',
    quantity: 1,
    itemState: 'AVAILABLE',
    thumbnailImageUrl: null,
    likeCount: 0,
    exchangeRequestCount: 0,
    isLiked: false,
    createdAt: '2026-01-01T00:00:00',
    groups: [groupA],
    ...overrides,
  }
}

// 사용자 ID 1의 토큰 (payload: {"sub":"1"})
const accessToken = `header.${btoa(JSON.stringify({ sub: '1' }))}.signature`

function mockApi(myItemsByGroup: Record<number, MyItemListItem[][]>) {
  return vi
    .spyOn(axios, 'get')
    .mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
      if (url === 'http://api.test/items/900') return { data: { data: target } }
      if (url === '/bff/my-items') {
        const { groupId, cursor } = config?.params ?? {}
        const pages = myItemsByGroup[groupId] ?? [[]]
        const index = cursor ? Number(cursor) : 0
        const hasNext = index + 1 < pages.length
        return {
          data: {
            data: {
              items: pages[index],
              nextCursor: hasNext ? String(index + 1) : null,
              hasNext,
            },
            error: null,
          },
        }
      }
      throw new Error(`unexpected GET ${url}`)
    })
}

function renderForm() {
  render(
    <ExchangeForm
      itemId={900}
      includeGroupId
      submitLabel="요청하기"
      onSubmit={vi.fn()}
    />,
  )
}

function listedTitles() {
  return within(screen.getByText(/2\) 내 물품 선택/).closest('section')!)
    .queryAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)
}

beforeEach(() => window.sessionStorage.setItem('accessToken', accessToken))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

it('그룹을 고르기 전에는 내 물품을 조회하지 않는다', async () => {
  const get = mockApi({})
  renderForm()

  expect(
    await screen.findByText(
      '그룹을 선택하면 그 그룹에 등록한 내 물품이 표시됩니다.',
    ),
  ).toBeTruthy()
  expect(get.mock.calls.some(([url]) => url === '/bff/my-items')).toBe(false)
})

it('선택한 그룹의 물품만 교환 가능한 물품부터 보여준다', async () => {
  const get = mockApi({
    1: [
      [
        myItem(1, '거래 완료 물품', { itemState: 'UNAVAILABLE' }),
        myItem(2, '다른 그룹 물품', { groups: [groupB] }),
        myItem(3, '교환 가능 물품'),
      ],
      [myItem(4, '다음 페이지 교환 가능 물품')],
    ],
  })
  renderForm()

  fireEvent.change(await screen.findByRole('combobox'), {
    target: { value: '1' },
  })

  await screen.findByText('교환 가능 물품')
  expect(listedTitles()).toEqual([
    '교환 가능 물품',
    '다음 페이지 교환 가능 물품',
    '거래 완료 물품',
  ])
  expect(screen.getByText('1 / 1')).toBeTruthy()
  expect(
    get.mock.calls
      .filter(([url]) => url === '/bff/my-items')
      .every(
        ([, config]) => (config?.params as { groupId?: number }).groupId === 1,
      ),
  ).toBe(true)
})

it('그룹을 바꾸면 그 그룹 목록을 다시 불러오고 다른 그룹 선택은 해제한다', async () => {
  mockApi({
    1: [[myItem(1, '판교 물품')]],
    2: [[myItem(2, '서울 물품', { groups: [groupB] })]],
  })
  renderForm()

  const select = await screen.findByRole('combobox')
  fireEvent.change(select, { target: { value: '1' } })
  fireEvent.click(await screen.findByRole('checkbox'))
  expect(screen.getByText('2) 내 물품 선택 (1)')).toBeTruthy()

  fireEvent.change(select, { target: { value: '2' } })

  await screen.findByText('서울 물품')
  expect(screen.queryByText('판교 물품')).toBeNull()
  await waitFor(() =>
    expect(screen.getByText('2) 내 물품 선택 (0)')).toBeTruthy(),
  )
})
