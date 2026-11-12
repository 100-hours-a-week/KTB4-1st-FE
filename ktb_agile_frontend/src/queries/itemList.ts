import { useMemo } from 'react'
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { fetchItems } from '@/api/items'
import type { ItemListItem, ItemSort, ItemState } from '@/types/item'
import {
  getAccessTokenOrRedirect,
  getUserIdFromAccessToken,
} from '@/utils/auth'

export const itemListKeys = {
  all: ['items'] as const,
  group: (groupId: number | null) => ['items', groupId] as const,
  /**
   * 거래 상태 필터가 없는 목록은 기존 키를 그대로 쓰고,
   * 필터가 있으면 상태를 덧붙여 필터별로 따로 캐시합니다.
   */
  list: (
    groupId: number | null,
    userId: number | string | null,
    sort: ItemSort,
    itemState: ItemState | null = null,
  ) =>
    itemState
      ? (['items', groupId, userId, sort, itemState] as const)
      : (['items', groupId, userId, sort] as const),
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

/**
 * 물품을 수정한 뒤 목록 캐시에 남은 예전 사진 주소를 지웁니다.
 * 무효화만으로는 다시 받기 전까지 예전 값이 남아, 상세 화면이 예전 사진을 자리 표시로 보여 줄 수 있습니다.
 */
export function forgetCachedListThumbnail(
  queryClient: QueryClient,
  itemId: number,
) {
  queryClient.setQueriesData<InfiniteData<{ items?: ItemListItem[] }>>(
    { queryKey: itemListKeys.all },
    (data) =>
      data?.pages
        ? {
            ...data,
            pages: data.pages.map((page) =>
              page?.items?.some((entry) => entry.itemId === itemId)
                ? {
                    ...page,
                    items: page.items.map((entry) =>
                      entry.itemId === itemId
                        ? {
                            ...entry,
                            thumbnailImageUrl: null,
                            detailThumbnailImageUrl: null,
                          }
                        : entry,
                    ),
                  }
                : page,
            ),
          }
        : data,
  )
}

export function useItemList(
  groupId: number | null,
  router: { replace(href: string): void },
  sort: ItemSort = 'latest',
  itemState: ItemState | null = null,
) {
  const token =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem('accessToken')
  const userId = token ? (getUserIdFromAccessToken(token) ?? token) : null
  const queryKey = useMemo(
    () => itemListKeys.list(groupId, userId, sort, itemState),
    [groupId, userId, sort, itemState],
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
        itemState,
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
