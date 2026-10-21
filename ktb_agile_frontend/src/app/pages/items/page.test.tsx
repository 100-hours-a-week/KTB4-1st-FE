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
import ItemList from './page'
import type { ItemListItem } from '@/types/item'
import {
  readItemListSession,
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

beforeEach(() => {
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
  return get
}
function intersect(index: number, visible = true) {
  const observer = observers[index]
  observer.callback(
    [{ isIntersecting: visible } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  )
}

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

it('물품 클릭 시 누적 목록과 위치를 저장하고 복원 후 저장된 커서로 이어 조회한다', async () => {
  const get = await showList()
  get.mockResolvedValueOnce(page(makeItems(21, 20), 'page-3'))
  await act(async () => intersect(0))
  await screen.findByText('물품 40')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 1500 })
  fireEvent.scroll(window)
  fireEvent.click(screen.getByText('물품 25'))
  expect(readItemListSession(1)).toMatchObject({
    groupId: 1,
    scrollY: 1500,
    nextCursor: 'page-3',
    hasNext: true,
  })
  expect(readItemListSession(1)?.items).toHaveLength(40)
  // 페이지 이동 과정에서 스크롤이 초기화되어도 저장 위치는 유지합니다.
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  fireEvent.scroll(window)
  cleanup()
  observers.length = 0
  get.mockClear().mockResolvedValueOnce({
    data: { data: { groups: [{ groupId: 1, groupName: '테스트 그룹' }] } },
  })
  render(<ItemList />)
  await screen.findByText('물품 40')
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1500,
      behavior: 'instant',
    }),
  )
  expect(get).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(observers).toHaveLength(1))
  get.mockResolvedValueOnce(page(makeItems(41, 2), null))
  await act(async () => intersect(0))
  await screen.findByText('물품 42')
  expect(get.mock.calls[1][1]).toMatchObject({ params: { cursor: 'page-3' } })
})

it('페이지를 닫거나 목록이 해제될 때 마지막 스크롤 위치를 저장한다', async () => {
  await showList()
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 800 })
  fireEvent.scroll(window)
  fireEvent(window, new Event('pagehide'))
  expect(readItemListSession(1)?.scrollY).toBe(800)
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 900 })
  fireEvent.scroll(window)
  cleanup()
  expect(readItemListSession(1)?.scrollY).toBe(900)
})

it('다른 그룹의 저장 목록은 사용하지 않는다', async () => {
  saveItemListSession({
    groupId: 2,
    items: makeItems(100, 20),
    nextCursor: null,
    hasNext: false,
    scrollY: 1000,
  })
  const get = await showList()
  expect(get).toHaveBeenCalledTimes(2)
  expect(screen.queryByText('물품 100')).toBeNull()
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('잘못된 저장 데이터가 있으면 첫 페이지를 새로 조회한다', async () => {
  window.sessionStorage.setItem('item-list:v1:1', '{broken')
  const get = await showList()
  expect(get).toHaveBeenCalledTimes(2)
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('저장된 이미지와 카드가 준비된 뒤 위치를 복원하고 무한스크롤을 활성화한다', async () => {
  const imageLoads: (() => void)[] = []
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        imageLoads.push(() => this.onload?.())
      }
    },
  )
  saveItemListSession({
    groupId: 1,
    items: makeItems(1, 3).map((item) => ({
      ...item,
      thumbnailImageUrl: '/test.png',
    })),
    nextCursor: 'page-2',
    hasNext: true,
    scrollY: 500,
  })
  vi.spyOn(axios, 'get').mockResolvedValueOnce({
    data: { data: { groups: [{ groupId: 1, groupName: '테스트 그룹' }] } },
  })
  render(<ItemList />)
  await waitFor(() => expect(imageLoads).toHaveLength(3))
  expect(window.scrollTo).not.toHaveBeenCalled()
  expect(observers).toHaveLength(0)
  await act(async () => imageLoads.forEach((load) => load()))
  await screen.findByText('물품 3')
  await waitFor(() =>
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: 'instant',
    }),
  )
  await waitFor(() => expect(observers).toHaveLength(1))
})
