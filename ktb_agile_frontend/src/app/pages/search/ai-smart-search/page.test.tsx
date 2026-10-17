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
import SmartSearchProvider from '@/components/smart-search/SmartSearchProvider'
import AiSmartSearchPage from './page'

type ListRequestConfig = AxiosRequestConfig<unknown, unknown>

function listParams(config?: ListRequestConfig) {
  return config?.params as { groupId?: number; cursor?: string } | undefined
}

function renderPage() {
  return render(
    <SmartSearchProvider>
      <AiSmartSearchPage />
    </SmartSearchProvider>,
  )
}

const router = { back: vi.fn(), push: vi.fn(), replace: vi.fn() }
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

const groups = [
  { groupId: 1, groupName: '우리 동네' },
  { groupId: 2, groupName: '친구들' },
]

function mockLists(items = [item], joinedGroups = [groups[0]]) {
  return vi.spyOn(axios, 'get').mockImplementation(async (url) => ({
    data: {
      data:
        url === '/bff/me/groups'
          ? { groups: joinedGroups, nextCursor: null, hasNext: false }
          : { items, nextCursor: null, hasNext: false },
      error: null,
    },
  }))
}

async function selectGroup(groupId = 1) {
  const select = screen.getByRole('combobox', { name: '검색할 그룹' })
  await waitFor(() => expect(select).toHaveProperty('disabled', false))
  fireEvent.change(select, { target: { value: String(groupId) } })
}

beforeEach(() => window.sessionStorage.setItem('accessToken', 'access-token'))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

it('그룹을 선택하기 전에는 내 물품을 불러오거나 보여주지 않는다', async () => {
  const get = mockLists()

  renderPage()

  await waitFor(() =>
    expect(get).toHaveBeenCalledWith('/bff/me/groups', expect.anything()),
  )
  expect(get.mock.calls.some(([url]) => url === '/bff/my-items')).toBe(false)
  expect(screen.queryByText('내 물건 목록')).toBeNull()
  expect(screen.getByRole('button', { name: '검색하기' })).toHaveProperty(
    'disabled',
    true,
  )
})

it('선택한 그룹으로 페이지를 조회하고 그룹 변경 시 커서와 선택을 초기화한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockImplementation(async (url: string, config?: ListRequestConfig) => ({
      data: {
        data:
          url === '/bff/me/groups'
            ? { groups, nextCursor: null, hasNext: false }
            : listParams(config)?.groupId === 2
              ? {
                  items: [
                    {
                      ...item,
                      itemId: 102,
                      title: '캠핑 랜턴',
                      groups: [groups[1]],
                    },
                  ],
                  nextCursor: null,
                  hasNext: false,
                }
              : {
                  items: [item],
                  nextCursor: listParams(config)?.cursor ? null : 'next-page',
                  hasNext: !listParams(config)?.cursor,
                },
        error: null,
      },
    }))

  renderPage()
  await selectGroup(1)
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  expect(get).toHaveBeenCalledWith(
    '/bff/my-items',
    expect.objectContaining({ params: { groupId: 1 } }),
  )

  await waitFor(() =>
    expect(get).toHaveBeenCalledWith(
      '/bff/my-items',
      expect.objectContaining({ params: { groupId: 1, cursor: 'next-page' } }),
    ),
  )

  await selectGroup(2)
  expect(
    await screen.findByRole('checkbox', { name: /캠핑 랜턴/ }),
  ).toBeTruthy()
  expect(get).toHaveBeenLastCalledWith(
    '/bff/my-items',
    expect.objectContaining({ params: { groupId: 2 } }),
  )
  expect(screen.queryByRole('checkbox', { name: /아이폰 충전기/ })).toBeNull()
  expect(screen.queryByRole('list', { name: '선택한 물품' })).toBeNull()
  expect(screen.getByRole('button', { name: '검색하기' })).toHaveProperty(
    'disabled',
    true,
  )
})

it('5개씩 표시하고 마지막으로 받은 페이지에서 다음 묶음을 미리 조회하며 선택을 유지한다', async () => {
  const allItems = Array.from({ length: 23 }, (_, index) => ({
    ...item,
    itemId: 1000 + index,
    title: `교환 물품 ${index + 1}`,
  }))
  const get = vi
    .spyOn(axios, 'get')
    .mockImplementation(async (url: string, config?: ListRequestConfig) => {
      const offset = Number(listParams(config)?.cursor ?? 0)
      return {
        data: {
          data:
            url === '/bff/me/groups'
              ? { groups, nextCursor: null, hasNext: false }
              : {
                  items: allItems.slice(offset, offset + 10),
                  nextCursor: offset + 10 < 23 ? String(offset + 10) : null,
                  hasNext: offset + 10 < 23,
                },
          error: null,
        },
      }
    })
  renderPage()
  await selectGroup()
  const first = await screen.findByRole('checkbox', {
    name: /교환 물품 1(?!\d)/,
  })
  expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  expect(
    get.mock.calls.filter(([url]) => url === '/bff/my-items'),
  ).toHaveLength(1)
  fireEvent.click(first)
  fireEvent.click(
    within(
      screen.getByRole('group', { name: '교환 물품 1 요청 수량' }),
    ).getByRole('button', { name: '+' }),
  )
  expect(
    within(screen.getByRole('list', { name: '선택한 물품' })).getByText(
      '교환 물품 1 · 2개',
    ),
  ).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(
    await screen.findByRole('checkbox', { name: /교환 물품 6(?!\d)/ }),
  ).toBeTruthy()
  await waitFor(() =>
    expect(get).toHaveBeenCalledWith(
      '/bff/my-items',
      expect.objectContaining({ params: { groupId: 1, cursor: '10' } }),
    ),
  )
  expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  expect(
    screen.getByRole('list', { name: '선택한 물품' }).textContent,
  ).toContain('교환 물품 1 · 2개')

  fireEvent.click(screen.getByRole('button', { name: '이전' }))
  expect(
    await screen.findByRole('checkbox', { name: /교환 물품 1(?!\d)/ }),
  ).toHaveProperty('checked', true)
  expect(
    get.mock.calls.filter(([url]) => url === '/bff/my-items'),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('checkbox', { name: /교환 물품 1(?!\d)/ }))
  expect(screen.queryByRole('list', { name: '선택한 물품' })).toBeNull()

  for (let page = 2; page <= 5; page++) {
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    await screen.findByText(`${page}페이지`)
    if (page === 4)
      await waitFor(() =>
        expect(get).toHaveBeenCalledWith(
          '/bff/my-items',
          expect.objectContaining({ params: { groupId: 1, cursor: '20' } }),
        ),
      )
  }
  expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  expect(screen.getByRole('button', { name: '다음' })).toHaveProperty(
    'disabled',
    true,
  )
})

it('교환 불가 물품을 건너뛰고 표시할 5개를 채운다', async () => {
  vi.spyOn(axios, 'get').mockImplementation(
    async (url: string, config?: ListRequestConfig) => ({
      data: {
        data:
          url === '/bff/me/groups'
            ? { groups, nextCursor: null, hasNext: false }
            : listParams(config)?.cursor
              ? {
                  items: Array.from({ length: 5 }, (_, index) => ({
                    ...item,
                    itemId: 200 + index,
                    title: `물품 ${index}`,
                  })),
                  nextCursor: null,
                  hasNext: false,
                }
              : {
                  items: [{ ...item, itemState: 'UNAVAILABLE' }],
                  nextCursor: 'next-page',
                  hasNext: true,
                },
        error: null,
      },
    }),
  )
  renderPage()
  await selectGroup()
  await screen.findByRole('checkbox', { name: /물품 0/ })
  expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  expect(screen.queryByRole('checkbox', { name: /아이폰 충전기/ })).toBeNull()
  expect(screen.getByRole('button', { name: '다음' })).toHaveProperty(
    'disabled',
    true,
  )
})

it.each([{ items: [] }, { items: [{ ...item, itemState: 'UNAVAILABLE' }] }])(
  '선택할 물품이 없으면 페이지 버튼 대신 안내한다',
  async ({ items }) => {
    mockLists(items)
    renderPage()
    await selectGroup()
    expect(
      await screen.findByText('교환 대상으로 선택할 물품이 없습니다'),
    ).toBeTruthy()
    expect(
      screen.queryByRole('navigation', { name: '내 물품 페이지' }),
    ).toBeNull()
  },
)

it('다음 묶음 조회 실패 후 현재 페이지를 유지하며 다시 시도한다', async () => {
  let failed = false
  const get = vi
    .spyOn(axios, 'get')
    .mockImplementation(async (url: string, config?: ListRequestConfig) => {
      if (listParams(config)?.cursor && !failed) {
        failed = true
        throw new Error('일시적인 조회 오류')
      }
      return {
        data: {
          data:
            url === '/bff/me/groups'
              ? { groups, nextCursor: null, hasNext: false }
              : listParams(config)?.cursor
                ? {
                    items: [{ ...item, itemId: 200 }],
                    nextCursor: null,
                    hasNext: false,
                  }
                : {
                    items: Array.from({ length: 10 }, (_, index) => ({
                      ...item,
                      itemId: 100 + index,
                    })),
                    nextCursor: 'next-page',
                    hasNext: true,
                  },
          error: null,
        },
      }
    })
  renderPage()
  await selectGroup()
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(5))
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(await screen.findByText('일시적인 조회 오류')).toBeTruthy()
  expect(screen.getByText('2페이지')).toBeTruthy()
  expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await waitFor(() =>
    expect(screen.queryByText('일시적인 조회 오류')).toBeNull(),
  )
  expect(
    get.mock.calls.filter(
      ([, config]) => listParams(config)?.cursor === 'next-page',
    ),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(screen.getByText('3페이지')).toBeTruthy()
  expect(screen.getAllByRole('checkbox')).toHaveLength(1)
})

it('물품과 조건을 보내고 성공하면 결과 페이지로 이동한다', async () => {
  const get = mockLists()
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [{ itemId: 202 }] }, error: null },
  })

  renderPage()
  await waitFor(() =>
    expect(get).toHaveBeenCalledWith(
      '/bff/me/groups',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    ),
  )
  await selectGroup()

  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  const quantityControl = screen.getByRole('group', {
    name: '아이폰 충전기 요청 수량',
  })
  expect(
    within(quantityControl).getByRole('button', { name: '−' }),
  ).toHaveProperty('disabled', true)
  fireEvent.click(within(quantityControl).getByRole('button', { name: '+' }))
  expect(
    within(quantityControl).getByRole('button', { name: '+' }),
  ).toHaveProperty('disabled', true)
  expect(
    screen.getByRole('checkbox', { name: /아이폰 충전기/ }),
  ).toHaveProperty('checked', true)
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
      items: [{ itemId: 101, quantity: 2 }],
      preferenceText: '야식으로 먹을 거 찾아요',
    },
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith(
      '/pages/search/ai-smart-search/result',
    ),
  )
})

it('물품별 수량을 독립적으로 선택하고 감소 버튼은 1개 아래로 내리지 않는다', async () => {
  mockLists([item, { ...item, itemId: 102, title: '캠핑 랜턴', quantity: 3 }])
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [] }, error: null },
  })

  renderPage()
  await selectGroup()
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.click(screen.getByRole('checkbox', { name: /캠핑 랜턴/ }))

  const chargerQuantity = within(
    screen.getByRole('group', { name: '아이폰 충전기 요청 수량' }),
  )
  const lanternQuantity = within(
    screen.getByRole('group', { name: '캠핑 랜턴 요청 수량' }),
  )
  fireEvent.click(chargerQuantity.getByRole('button', { name: '+' }))
  fireEvent.click(lanternQuantity.getByRole('button', { name: '+' }))
  fireEvent.click(lanternQuantity.getByRole('button', { name: '+' }))
  expect(lanternQuantity.getByRole('button', { name: '+' })).toHaveProperty(
    'disabled',
    true,
  )
  fireEvent.click(chargerQuantity.getByRole('button', { name: '−' }))
  expect(chargerQuantity.getByRole('button', { name: '−' })).toHaveProperty(
    'disabled',
    true,
  )

  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
  expect(post.mock.calls[0][1]).toMatchObject({
    items: [
      { itemId: 101, quantity: 1 },
      { itemId: 102, quantity: 3 },
    ],
  })
})

it('검색 실패 시 서버 메시지를 모달로 표시하고 확인하면 닫는다', async () => {
  mockLists()
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

  renderPage()
  await selectGroup()
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.click(screen.getByRole('button', { name: '검색하기' }))

  expect(await screen.findByText('AI 검색 실패')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  await waitFor(() => expect(screen.queryByText('AI 검색 실패')).toBeNull())
})

it('인증 오류는 검색 오류 모달로 표시하지 않는다', async () => {
  mockLists()
  vi.spyOn(axios, 'post').mockRejectedValue({
    isAxiosError: true,
    response: { status: 401 },
  })

  renderPage()
  await selectGroup()
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
  mockLists()
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [] }, error: null },
  })

  renderPage()
  await selectGroup()
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

it('말풍선 아래 드롭다운에서 선택한 그룹 ID로 검색한다', async () => {
  mockLists(
    [
      { ...item, groups },
      {
        ...item,
        itemId: 102,
        title: '캠핑 랜턴',
        groups: [groups[1]],
      },
      {
        ...item,
        itemId: 103,
        title: '탁상 시계',
        groups: [groups[0]],
      },
    ],
    groups,
  )
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { items: [] }, error: null },
  })

  renderPage()
  await selectGroup(2)
  expect(screen.queryByRole('checkbox', { name: /탁상 시계/ })).toBeNull()
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

it('페이지를 떠났다 돌아와도 선택한 그룹과 물품, 조건이 유지된다', async () => {
  mockLists()

  const { rerender } = renderPage()
  await selectGroup()
  fireEvent.click(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  )
  fireEvent.change(
    screen.getByPlaceholderText('예) 과자 물 칫솔 등과 바꾸고 싶어'),
    { target: { value: '야식으로 먹을 거 찾아요' } },
  )

  // layout(Provider)은 그대로 두고 page만 교체하는 이동을 흉내 낸다.
  rerender(
    <SmartSearchProvider>
      <div />
    </SmartSearchProvider>,
  )
  rerender(
    <SmartSearchProvider>
      <AiSmartSearchPage />
    </SmartSearchProvider>,
  )

  expect(
    await screen.findByRole('checkbox', { name: /아이폰 충전기/ }),
  ).toHaveProperty('checked', true)
  expect(screen.getByRole('combobox', { name: '검색할 그룹' })).toHaveProperty(
    'value',
    '1',
  )
  expect(
    screen.getByPlaceholderText('예) 과자 물 칫솔 등과 바꾸고 싶어'),
  ).toHaveProperty('value', '야식으로 먹을 거 찾아요')
})
