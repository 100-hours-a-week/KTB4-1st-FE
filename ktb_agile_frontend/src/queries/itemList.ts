import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchItems } from '@/api/items'
import type { ItemSort } from '@/types/item'
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
