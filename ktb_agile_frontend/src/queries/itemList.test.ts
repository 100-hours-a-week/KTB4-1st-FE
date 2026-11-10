import { QueryClient } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import type { ItemListItem } from '@/types/item'
import { findCachedListThumbnail, itemListKeys } from './itemList'

function listItem(itemId: number, thumbnailImageUrl: string | null) {
  return { itemId, thumbnailImageUrl } as ItemListItem
}

function page(items: ItemListItem[]) {
  return { items, nextCursor: null, hasNext: false }
}

it('목록 캐시의 여러 페이지 중에서 물품의 목록 썸네일 주소를 찾는다', () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(itemListKeys.list(1, 7, 'latest'), {
    pages: [
      page([listItem(1, '/list-1.webp')]),
      page([listItem(2, '/list-2.webp')]),
    ],
    pageParams: ['', '1'],
  })

  expect(findCachedListThumbnail(queryClient, 2)).toBe('/list-2.webp')
})

it('다른 그룹·정렬의 목록 캐시에 있는 물품도 찾는다', () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(itemListKeys.list(1, 7, 'latest'), {
    pages: [page([listItem(1, '/list-1.webp')])],
    pageParams: [''],
  })
  queryClient.setQueryData(itemListKeys.list(2, 7, 'recommended'), {
    pages: [page([listItem(5, '/list-5.webp')])],
    pageParams: [''],
  })

  expect(findCachedListThumbnail(queryClient, 5)).toBe('/list-5.webp')
})

it('목록 캐시에 없거나 썸네일이 없는 물품은 null을 반환한다', () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(itemListKeys.list(1, 7, 'latest'), {
    pages: [page([listItem(1, null)])],
    pageParams: [''],
  })

  expect(findCachedListThumbnail(queryClient, 1)).toBeNull()
  expect(findCachedListThumbnail(queryClient, 99)).toBeNull()
  expect(findCachedListThumbnail(new QueryClient(), 1)).toBeNull()
})
