import { useMemo } from 'react'
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { fetchItems } from '@/api/items'
import type { ItemListItem, ItemSort } from '@/types/item'
import {
  getAccessTokenOrRedirect,
  getUserIdFromAccessToken,
} from '@/utils/auth'

export const itemListKeys = {
  all: ['items'] as const,
  group: (groupId: number | null) => ['items', groupId] as const,
  list: (
    groupId: number | null,
    userId: number | string | null,
    sort: ItemSort,
  ) => ['items', groupId, userId, sort] as const,
}

/**
 * 목록 캐시에 남아 있는 물품의 목록용 썸네일 주소를 찾습니다.
 * 상세 화면은 이 주소를 응답 전 자리 표시 이미지로 사용하므로, 목록이 받은 주소를 그대로 돌려줘 브라우저 캐시를 재사용합니다.
 */
export function findCachedListThumbnail(
  queryClient: QueryClient,
  itemId: number,
): string | null {
  const cachedLists = queryClient.getQueriesData<
    InfiniteData<{ items?: ItemListItem[] }>
  >({ queryKey: itemListKeys.all })
  for (const [, data] of cachedLists) {
    for (const page of data?.pages ?? []) {
      const item = page?.items?.find((entry) => entry.itemId === itemId)
      if (item?.thumbnailImageUrl) return item.thumbnailImageUrl
    }
  }
  return null
}

export function useItemList(
  groupId: number | null,
  router: { replace(href: string): void },
  sort: ItemSort = 'latest',
) {
  const token =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem('accessToken')
  const userId = token ? (getUserIdFromAccessToken(token) ?? token) : null
  const queryKey = useMemo(
    () => itemListKeys.list(groupId, userId, sort),
    [groupId, userId, sort],
  )
  const query = useInfiniteQuery({
    queryKey,
    enabled: groupId !== null,
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) => {
      const accessToken = getAccessTokenOrRedirect(router)
      if (!accessToken) throw new Error('로그인이 필요합니다.')
      if (groupId === null) throw new Error('그룹을 선택해주세요.')
      return fetchItems({
        groupId,
        sort,
        cursor: pageParam,
        accessToken,
        signal,
      })
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNext && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
  })
  return { ...query, queryKey }
}
