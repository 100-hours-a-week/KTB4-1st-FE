import {
  act,
  cleanup,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ItemList from './page'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import type { ReactElement } from 'react'
import type { ItemListItem, ItemSort } from '@/types/item'
import {
  readItemListSession,
  readLastItemListSession,
  saveItemListSession,
} from '@/utils/itemListSession'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/utils/currentGroup', () => ({
  getCurrentGroupId: () => 1,
  setCurrentGroupId: vi.fn(),
}))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))
vi.mock('@/components/common/chatbot/ChatbotButton', () => ({
  default: () => null,
}))
vi.mock('@/components/common/inquiry/FloatingInquiryButton', () => ({
  default: () => null,
}))
vi.mock('@/components/common/item/ItemCard', () => ({
  default: ({ item }: { item: ItemListItem }) => (
    <a
      href={`/pages/items/${item.itemId}`}
      onClick={(event) => event.preventDefault()}
    >
      {item.title}
    </a>
  ),
}))

const observers: {
  callback: IntersectionObserverCallback
  observe: ReturnType<typeof vi.fn>
  unobserve: ReturnType<typeof vi.fn>
}[] = []
const makeItems = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    itemId: start + index,
    title: `물품 ${start + index}`,
    thumbnailImageUrl: null,
    contentPreview: '물품 설명',
    quantity: 1,
    owner: { userId: 1, nickname: '사용자' },
    itemState: 'AVAILABLE',
    likeCount: 0,
    viewCount: 0,
    exchangeRequestCount: 0,
    isLiked: false,
    createdAt: '2026-10-21T00:00:00',
  })) as ItemListItem[]
const page = (items: ItemListItem[], nextCursor: string | null) => ({
  data: {
    data: { items, nextCursor, hasNext: nextCursor !== null },
    error: null,
  },
})

let client: QueryClient
const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
const seed = (
  groupId: number,
  pages: ReturnType<typeof page>[],
  sort: ItemSort = 'latest',
) =>
  client.setQueryData(['items', groupId, 'test-token', sort], {
    pages: pages.map((value) => value.data.data),
    pageParams: pages.map((_, index) =>
      index === 0 ? '' : `page-${index + 1}`,
    ),
  })
const groups = (ids = [1]) => ({
  data: {
    data: {
      groups: ids.map((groupId) => ({ groupId, groupName: `그룹 ${groupId}` })),
    },
  },
})
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  window.history.replaceState(null, '', '/pages/items')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  vi.spyOn(window, 'scrollTo').mockImplementation(
    (options?: number | ScrollToOptions) => {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: typeof options === 'object' ? (options.top ?? 0) : 0,
      })
    },
  )
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(callback: IntersectionObserverCallback) {
        observers.push({
          callback,
          observe: this.observe,
          unobserve: this.unobserve,
        })
      }
    },
  )
})
afterEach(() => {
  cleanup()
  client.clear()
  observers.length = 0
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function showList(nextCursor: string | null = 'page-2') {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce({
      data: { data: { groups: [{ groupId: 1, groupName: '테스트 그룹' }] } },
    })
    .mockResolvedValueOnce(page(makeItems(1, 20), nextCursor))
  render(<ItemList />)
  await screen.findByText('물품 20')
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'instant',
    }),
  )
  if (nextCursor)
    await waitFor(() => expect(observers.length).toBeGreaterThan(0))
  return get
}
function intersect(index: number, visible = true) {
  const observer = observers[index]
  observer.callback(
    [{ isIntersecting: visible } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  )
}

it('최상단에서 당겨 놓으면 첫 페이지를 다시 조회해 기존 목록을 새 값으로 교체한다', async () => {
  const get = await showList(null)
  get.mockResolvedValueOnce(page(makeItems(101, 2), 'fresh-cursor'))
  const card = screen.getByText('물품 1')
  fireEvent.mouseDown(card, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 300 })
  await act(async () => fireEvent.mouseUp(document))
  await screen.findByText('물품 101')
  expect(screen.queryByText('물품 1')).toBeNull()
  expect(get.mock.calls[2][1]).toMatchObject({
    params: { size: 20 },
    signal: expect.any(AbortSignal),
  })
})

it('당겨서 재조회에 실패하면 기존 목록을 유지하고 오류를 표시한다', async () => {
  const get = await showList(null)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  get.mockRejectedValueOnce(new Error('network error'))
  const card = screen.getByText('물품 1')
  fireEvent.mouseDown(card, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 300 })
  await act(async () => fireEvent.mouseUp(document))
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.getByText('물품 1')).toBeDefined()
  expect(screen.getByText('물품 20')).toBeDefined()
})

it('뒤에서 세 번째 카드가 보이면 커서로 한 번 요청하고 다음 물품을 추가한다', async () => {
  const get = await showList()
  expect(observers[0].observe.mock.calls[0][0].textContent).toBe('물품 18')
  act(() => intersect(0, false))
  expect(get).toHaveBeenCalledTimes(2)
  let resolvePage!: (value: ReturnType<typeof page>) => void
  get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolvePage = resolve
      }),
  )
  act(() => {
    intersect(0)
    intersect(0)
  })
  expect(get).toHaveBeenCalledTimes(3)
  expect(get.mock.calls[2][1]).toMatchObject({ params: { cursor: 'page-2' } })
  await act(async () => resolvePage(page(makeItems(21, 20), 'page-3')))
  await screen.findByText('물품 40')
  expect(screen.getByText('물품 1')).toBeDefined()
  await waitFor(() =>
    expect(observers.at(-1)?.observe.mock.calls[0][0].textContent).toBe(
      '물품 38',
    ),
  )
})

it('다음 페이지가 없으면 관찰과 추가 요청을 하지 않는다', async () => {
  const get = await showList(null)
  expect(observers).toHaveLength(0)
  expect(get).toHaveBeenCalledTimes(2)
})

it('마지막 페이지를 추가한 뒤에는 더 요청하지 않는다', async () => {
  const get = await showList()
  get.mockResolvedValueOnce(page(makeItems(21, 2), null))
  await act(async () => intersect(0))
  await screen.findByText('물품 22')
  expect(observers).toHaveLength(1)
  expect(get).toHaveBeenCalledTimes(3)
})

it('목록으로 돌아오면 캐시와 스크롤을 복원하면서 최신 커서로 모든 페이지를 재조회한다', async () => {
  const get = await showList()
  get.mockResolvedValueOnce(page(makeItems(21, 20), 'old-page-3'))
  await act(async () => intersect(0))
  await screen.findByText('물품 40')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 1500 })
  fireEvent.scroll(window)
  fireEvent.click(screen.getByText('물품 25'))
  expect(readItemListSession(1)).toEqual({
    groupId: 1,
    sort: 'latest',
    scrollY: 1500,
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  fireEvent.scroll(window)
  cleanup()
  observers.length = 0
  vi.mocked(window.scrollTo).mockClear()
  let resolveFirst!: (value: ReturnType<typeof page>) => void
  let itemRequests = 0
  get.mockClear().mockImplementation((url) => {
    if (url === '/bff/me/groups') return Promise.resolve(groups())
    itemRequests += 1
    if (itemRequests === 1)
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    if (itemRequests === 2)
      return Promise.resolve(page(makeItems(120, 20), 'fresh-page-3'))
    return Promise.resolve(page(makeItems(140, 2), null))
  })
  render(<ItemList />)
  expect(screen.getByText('물품 40')).toBeDefined()
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1500,
      behavior: 'instant',
    }),
  )
  expect(window.scrollTo).not.toHaveBeenCalledWith({
    top: 0,
    behavior: 'instant',
  })
  expect(get).toHaveBeenCalledTimes(2)
  await act(async () => resolveFirst(page(makeItems(100, 20), 'fresh-page-2')))
  await screen.findByText('물품 139')
  expect(screen.queryByText('물품 25')).toBeNull()
  expect(get.mock.calls[2][1]).toMatchObject({
    params: { cursor: 'fresh-page-2' },
  })
  await waitFor(() => expect(observers.length).toBeGreaterThan(0))
  await act(async () => intersect(observers.length - 1))
  await screen.findByText('물품 141')
  expect(get.mock.calls[3][1]).toMatchObject({
    params: { cursor: 'fresh-page-3' },
  })
})

it('페이지를 닫거나 목록이 해제될 때 마지막 스크롤 위치만 저장한다', async () => {
  await showList()
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 800 })
  fireEvent.scroll(window)
  fireEvent(window, new Event('pagehide'))
  expect(readItemListSession(1)).toEqual({
    groupId: 1,
    sort: 'latest',
    scrollY: 800,
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 })
  fireEvent.scroll(window)
  cleanup()
  expect(readItemListSession(1)?.scrollY).toBe(900)
})

it('새로고침으로 Query 캐시가 없으면 저장 위치를 무시하고 첫 페이지를 표시한다', async () => {
  saveItemListSession({ groupId: 1, sort: 'latest', scrollY: 1500 })
  const get = await showList(null)
  expect(get.mock.calls[1][1]).toMatchObject({
    params: { size: 20 },
  })
  expect(window.scrollY).toBe(0)
  expect(readLastItemListSession()).toBeNull()
})

it('명시된 그룹을 우선하며 다른 그룹의 위치와 캐시는 복원하지 않는다', async () => {
  saveItemListSession({ groupId: 2, sort: 'latest', scrollY: 1000 })
  seed(2, [page(makeItems(100, 3), null)])
  window.history.replaceState(null, '', '/pages/items?groupId=1')
  vi.spyOn(axios, 'get')
    .mockResolvedValueOnce(groups([1, 2]))
    .mockResolvedValueOnce(page(makeItems(1, 3), null))
  render(<ItemList />)
  await screen.findByText('물품 3')
  await waitFor(() => expect(window.scrollY).toBe(0))
  expect(screen.queryByText('물품 100')).toBeNull()
})

it('그룹 지정이 없으면 마지막 목록 그룹을 선택하고 캐시 위치를 복원한다', async () => {
  saveItemListSession({ groupId: 2, sort: 'latest', scrollY: 1200 })
  seed(2, [page(makeItems(100, 20), null)])
  vi.spyOn(axios, 'get')
    .mockResolvedValueOnce(groups([1, 2]))
    .mockResolvedValueOnce(page(makeItems(100, 20), null))
  render(<ItemList />)
  await screen.findByText('물품 119')
  expect(screen.getByRole('button', { name: '그룹 2' })).toBeDefined()
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1200,
      behavior: 'instant',
    }),
  )
})

it('그룹 전환과 재선택 시 새 첫 페이지를 조회하고 최상단으로 이동한다', async () => {
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValueOnce(groups([1, 2]))
    .mockResolvedValueOnce(page(makeItems(1, 20), null))
    .mockResolvedValueOnce(page(makeItems(100, 20), null))
    .mockResolvedValueOnce(page(makeItems(200, 20), null))
  render(<ItemList />)
  await screen.findByText('물품 20')
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', { name: '그룹 1' }))
  fireEvent.click(screen.getByRole('button', { name: '그룹 2' }))
  fireEvent(window, new Event('pagehide'))
  expect(readLastItemListSession()?.groupId).not.toBe(1)
  await screen.findByText('물품 119')
  fireEvent.click(screen.getByRole('button', { name: '그룹 2' }))
  fireEvent.click(screen.getByRole('button', { name: '그룹 1' }))
  await screen.findByText('물품 219')
  expect(window.scrollY).toBe(0)
  expect(get).toHaveBeenCalledTimes(4)
})

it('이전 버전 스냅샷과 손상된 위치 정보는 목록에 사용하지 않는다', async () => {
  window.sessionStorage.setItem('item-list:v1:1', '{old}')
  window.sessionStorage.setItem(
    'item-list:v2:latest',
    JSON.stringify({ groupId: 1, items: makeItems(100, 3) }),
  )
  window.sessionStorage.setItem('item-list:v3:position', '{broken')
  await showList(null)
  expect(screen.queryByText('물품 100')).toBeNull()
  expect(window.sessionStorage.getItem('item-list:v1:1')).toBeNull()
  expect(window.sessionStorage.getItem('item-list:v2:latest')).toBeNull()
  expect(window.sessionStorage.getItem('accessToken')).toBe('test-token')
})

it('캐시된 카드를 이미지 대기 없이 표시하고 첫 화면이 그려지기 전에 위치를 복원한다', async () => {
  const items = makeItems(1, 3).map((item) => ({
    ...item,
    thumbnailImageUrl: '/test.png',
  }))
  saveItemListSession({ groupId: 1, sort: 'latest', scrollY: 500 })
  seed(1, [page(items, 'page-2')])
  client.setQueryData(
    ['joined-groups', 'test-token'],
    [{ groupId: 1, groupName: '테스트 그룹' }],
  )
  let restoreFrame: FrameRequestCallback | undefined
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    restoreFrame = callback
    return 1
  })
  vi.spyOn(axios, 'get').mockImplementation(() => new Promise(() => {}))
  render(<ItemList />)
  expect(screen.getByText('물품 3')).toBeDefined()
  expect(screen.queryByText('로딩 중 ...')).toBeNull()
  expect(observers).toHaveLength(0)
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: 500,
    behavior: 'instant',
  })
  expect(window.scrollTo).not.toHaveBeenCalledWith({
    top: 0,
    behavior: 'instant',
  })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  act(() => restoreFrame?.(performance.now()))
  expect(window.scrollY).toBe(500)
  // 백그라운드 재조회가 끝날 때까지 추가 페이지 요청을 막습니다.
  expect(observers).toHaveLength(0)
})

it('창에 다시 포커스하면 다른 사용자가 바꾼 물품 상태도 재조회한다', async () => {
  const get = await showList(null)
  get.mockResolvedValueOnce(
    page(
      [{ ...makeItems(1, 1)[0], title: '교환 완료', itemState: 'UNAVAILABLE' }],
      null,
    ),
  )
  await act(async () => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
  await screen.findByText('교환 완료')
  expect(screen.queryByText('물품 20')).toBeNull()
  focusManager.setFocused(undefined)
})

it('추가 조회 실패 후 버튼으로 같은 커서를 재시도한다', async () => {
  const get = await showList()
  get.mockRejectedValueOnce(new Error('network'))
  await act(async () => intersect(0))
  const retry = await screen.findByRole('button', { name: '다시 불러오기' })
  expect(observers).toHaveLength(1)
  get.mockResolvedValueOnce(page(makeItems(21, 2), null))
  fireEvent.click(retry)
  await screen.findByText('물품 22')
  expect(get.mock.calls[3][1]).toMatchObject({ params: { cursor: 'page-2' } })
})

it('인기순을 선택하면 직접 추천 API의 첫 페이지를 요청하고 추천 커서로 추가 조회한다', async () => {
  const get = await showList('latest-cursor')
  expect(String(get.mock.calls[1][0])).toMatch(/\/groups\/1\/items$/)
  get.mockResolvedValueOnce(page(makeItems(101, 3), 'recommendation-cursor'))
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 800 })
  fireEvent.scroll(window)
  fireEvent.click(screen.getByRole('button', { name: '정렬 방법: 최신순' }))
  fireEvent.click(screen.getByRole('button', { name: '인기순' }))
  await screen.findByText('물품 101')
  expect(screen.queryByText('물품 1')).toBeNull()
  expect(window.scrollY).toBe(0)
  const [url, options] = get.mock.calls[2]
  expect(String(url)).toMatch(/\/items\/recommendations$/)
  expect(options).toMatchObject({
    params: { groupId: 1, size: 20 },
    headers: { Authorization: 'Bearer test-token' },
    signal: expect.any(AbortSignal),
  })
  expect(options?.params).not.toHaveProperty('cursor')
  get.mockResolvedValueOnce(page(makeItems(104, 2), null))
  await waitFor(() => expect(observers.length).toBeGreaterThan(1))
  await act(async () => intersect(observers.length - 1))
  await screen.findByText('물품 105')
  expect(get.mock.calls[3][1]).toMatchObject({
    params: { groupId: 1, size: 20, cursor: 'recommendation-cursor' },
  })
  expect(
    client.getQueryData(['items', 1, 'test-token', 'latest']),
  ).toBeDefined()
  expect(
    client.getQueryData(['items', 1, 'test-token', 'recommended']),
  ).toBeDefined()
})

it('인기순에서 최신순으로 전환하면 추천 커서를 보내지 않고 최신 API로 조회한다', async () => {
  const get = await showList(null)
  get.mockResolvedValueOnce(page(makeItems(101, 3), 'recommendation-cursor'))
  fireEvent.click(screen.getByRole('button', { name: '정렬 방법: 최신순' }))
  fireEvent.click(screen.getByRole('button', { name: '인기순' }))
  await screen.findByText('물품 101')
  fireEvent(window, new Event('pagehide'))
  expect(readLastItemListSession()).toEqual({
    groupId: 1,
    sort: 'recommended',
    scrollY: 0,
  })

  get.mockResolvedValueOnce(page(makeItems(201, 3), null))
  fireEvent.click(screen.getByRole('button', { name: '정렬 방법: 인기순' }))
  fireEvent.click(screen.getByRole('button', { name: '최신순' }))
  await screen.findByText('물품 201')
  expect(screen.queryByText('물품 101')).toBeNull()
  expect(String(get.mock.calls[3][0])).toMatch(/\/groups\/1\/items$/)
  expect(get.mock.calls[3][1]?.params).toEqual({ size: 20 })
})

it('여러 페이지가 캐시된 정렬로 전환해도 첫 페이지만 새로 조회한다', async () => {
  const get = await showList(null)
  seed(
    1,
    [page(makeItems(101, 3), 'old-cursor'), page(makeItems(104, 3), null)],
    'recommended',
  )
  get.mockResolvedValueOnce(page(makeItems(201, 3), null))
  fireEvent.click(screen.getByRole('button', { name: '정렬 방법: 최신순' }))
  fireEvent.click(screen.getByRole('button', { name: '인기순' }))
  expect(screen.queryByText('물품 101')).toBeNull()
  expect(screen.queryByText('물품 104')).toBeNull()
  await screen.findByText('물품 201')
  expect(get).toHaveBeenCalledTimes(3)
  expect(get.mock.calls[2][1]?.params).toEqual({ groupId: 1, size: 20 })
  expect(
    client.getQueryData(['items', 1, 'test-token', 'recommended']),
  ).toMatchObject({
    pages: [{ items: makeItems(201, 3) }],
    pageParams: [''],
  })
  expect(
    client.getQueryData(['items', 1, 'test-token', 'latest']),
  ).toBeDefined()
})

it('인기순 상세에서 돌아오면 정렬과 누적 목록, 스크롤을 함께 복원한다', async () => {
  const get = await showList(null)
  get.mockResolvedValueOnce(page(makeItems(101, 3), 'recommendation-next'))
  fireEvent.click(screen.getByRole('button', { name: '정렬 방법: 최신순' }))
  fireEvent.click(screen.getByRole('button', { name: '인기순' }))
  await screen.findByText('물품 101')
  get.mockResolvedValueOnce(page(makeItems(104, 3), null))
  await waitFor(() => expect(observers.length).toBeGreaterThan(0))
  await act(async () => intersect(observers.length - 1))
  await screen.findByText('물품 106')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 })
  fireEvent.scroll(window)
  fireEvent.click(screen.getByText('물품 104'))
  expect(readItemListSession(1, 'recommended')).toEqual({
    groupId: 1,
    sort: 'recommended',
    scrollY: 900,
  })
  expect(readItemListSession(1, 'latest')).toBeNull()
  cleanup()
  vi.mocked(window.scrollTo).mockClear()
  get
    .mockClear()
    .mockImplementation((url) =>
      url === '/bff/me/groups'
        ? Promise.resolve(groups())
        : new Promise(() => {}),
    )
  render(<ItemList />)
  expect(
    screen.getByRole('button', { name: '정렬 방법: 인기순' }),
  ).toBeDefined()
  expect(screen.getByText('물품 106')).toBeDefined()
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: 900,
    behavior: 'instant',
  })
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  expect(String(get.mock.calls[0][0])).toMatch(/\/items\/recommendations$/)
})

it('인기순 캐시가 없으면 정렬만 복원하고 이전 스크롤 대신 첫 페이지를 표시한다', async () => {
  saveItemListSession({ groupId: 1, sort: 'recommended', scrollY: 1200 })
  const get = await showList(null)
  expect(
    screen.getByRole('button', { name: '정렬 방법: 인기순' }),
  ).toBeDefined()
  expect(String(get.mock.calls[1][0])).toMatch(/\/items\/recommendations$/)
  expect(get.mock.calls[1][1]?.params).toEqual({ groupId: 1, size: 20 })
  expect(window.scrollY).toBe(0)
})

it('정렬 정보가 없는 기존 위치는 최신순으로 복원한다', async () => {
  window.sessionStorage.setItem(
    'item-list:v3:position',
    JSON.stringify({ groupId: 1, scrollY: 500 }),
  )
  seed(1, [page(makeItems(1, 20), null)])
  vi.spyOn(axios, 'get')
    .mockResolvedValueOnce(groups())
    .mockResolvedValueOnce(page(makeItems(1, 20), null))
  render(<ItemList />)
  await screen.findByText('물품 20')
  expect(
    screen.getByRole('button', { name: '정렬 방법: 최신순' }),
  ).toBeDefined()
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: 500,
    behavior: 'instant',
  })
})
