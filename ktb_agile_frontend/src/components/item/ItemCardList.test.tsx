import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ItemListItem } from '@/types/item'
import * as dateUtils from '@/utils/date'
import ItemCardList from './ItemCardList'

let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(dateUtils, 'formatLastTime')
})
afterEach(() => {
  cleanup()
  client.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

function item(itemId: number): ItemListItem {
  return {
    itemId,
    title: `물품 ${itemId}`,
    contentPreview: '교환할 물품입니다.',
    quantity: 1,
    owner: { userId: 10, nickname: '이웃' },
    itemState: 'AVAILABLE',
    thumbnailImageUrl: `/mock-items/${itemId}.webp`,
    likeCount: 0,
    viewCount: 0,
    exchangeRequestCount: 0,
    isLiked: false,
    createdAt: '2026-10-31T00:00:00Z',
  }
}

const list = (items: ItemListItem[], isLoadingMore = false) => (
  <QueryClientProvider client={client}>
    <ItemCardList items={items} isLoadingMore={isLoadingMore} />
  </QueryClientProvider>
)

it('로딩 상태와 목록 배열이 바뀌어도 기존 카드 계산을 재사용하고 새 카드만 계산한다', () => {
  const items = [item(1), item(2)]
  const { rerender } = render(list(items))
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(2)

  rerender(list(items, true))
  expect(
    screen.getByRole('status', { name: '다음 물품 불러오는 중' }),
  ).toBeDefined()
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(2)

  rerender(list([...items, item(3)]))
  expect(screen.getByRole('heading', { name: '물품 3' })).toBeDefined()
  expect(screen.queryByRole('status')).toBeNull()
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(3)
})

it('수정된 물품의 제목·사진·좋아요는 갱신하고 변경 없는 카드는 다시 계산하지 않는다', () => {
  const items = [item(1), item(2)]
  const { rerender } = render(list(items))
  rerender(
    list([
      {
        ...items[0],
        title: '수정된 물품',
        thumbnailImageUrl: '/updated.webp',
        isLiked: true,
        likeCount: 9,
      },
      items[1],
    ]),
  )

  const card = screen
    .getByRole('heading', { name: '수정된 물품' })
    .closest('article')!
  expect(card.querySelector('img')?.getAttribute('src')).toBe('/updated.webp')
  expect(
    within(card)
      .getByRole('button', { name: '좋아요 취소' })
      .getAttribute('aria-pressed'),
  ).toBe('true')
  expect(within(card).getByText('9')).toBeDefined()
  expect(screen.queryByRole('heading', { name: '물품 1' })).toBeNull()
  // 등록 시간이 같으면 Compiler가 시간 표시 계산도 재사용합니다.
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(2)

  const changedCreatedAt = '2026-10-30T00:00:00Z'
  rerender(list([{ ...items[0], createdAt: changedCreatedAt }, items[1]]))
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(3)
  expect(dateUtils.formatLastTime).toHaveBeenLastCalledWith(changedCreatedAt)
})

it('카드 JSX를 재사용하는 중에도 좋아요 버튼의 자체 상태는 정상적으로 갱신된다', async () => {
  const items = [item(1)]
  sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'post').mockResolvedValueOnce({
    data: { data: { likeCount: 9 } },
  })
  const { rerender } = render(list(items))
  rerender(list(items, true))
  fireEvent.click(screen.getByRole('button', { name: '좋아요' }))
  await screen.findByText('9')
  expect(
    screen
      .getByRole('button', { name: '좋아요 취소' })
      .getAttribute('aria-pressed'),
  ).toBe('true')
  expect(dateUtils.formatLastTime).toHaveBeenCalledTimes(1)
})
