import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { ItemListItem } from '@/types/item'
import ItemCard from './ItemCard'

afterEach(cleanup)

const item: ItemListItem = {
  itemId: 1,
  title: '아이폰 15',
  contentPreview: '상태 좋은 아이폰입니다.',
  quantity: 1,
  owner: { userId: 12, nickname: '민지' },
  itemState: 'AVAILABLE',
  thumbnailImageUrl: null,
  likeCount: 0,
  exchangeRequestCount: 0,
  isLiked: false,
  createdAt: new Date().toISOString(),
}

it('물품의 핵심 정보와 거래 상태를 표시한다', () => {
  render(<ItemCard item={item} />)

  expect(screen.getByRole('heading', { name: '아이폰 15' })).toBeDefined()
  expect(screen.getByText('수량: 1개')).toBeDefined()
  expect(screen.getByText('등록자: 민지')).toBeDefined()
  expect(screen.getByText('방금 전')).toBeDefined()
  expect(screen.getByText('거래 가능')).toBeDefined()
})
