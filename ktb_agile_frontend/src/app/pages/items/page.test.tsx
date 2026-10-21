import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ItemList from './page'
import type { ItemListItem } from '@/types/item'

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
    <article>{item.title}</article>
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
  })) as ItemListItem[]
const page = (items: ItemListItem[], nextCursor: string | null) => ({
  data: {
    data: { items, nextCursor, hasNext: nextCursor !== null },
    error: null,
  },
})

beforeEach(() => {
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
