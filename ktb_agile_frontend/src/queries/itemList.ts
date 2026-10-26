import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import type { ItemListResponse } from '@/types/item'
import {
  getAccessTokenOrRedirect,
  getUserIdFromAccessToken,
} from '@/utils/auth'

export const itemListKeys = {
  all: ['items'] as const,
  group: (groupId: number | null) => ['items', groupId] as const,
}

export function useItemList(
  groupId: number | null,
  router: { replace(href: string): void },
) {
  const token =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem('accessToken')
  const userId = token ? (getUserIdFromAccessToken(token) ?? token) : null
  const queryKey = useMemo(
    () => [...itemListKeys.group(groupId), userId],
    [groupId, userId],
  )
  const query = useInfiniteQuery({
    queryKey,
    enabled: groupId !== null,
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) => {
      const accessToken = getAccessTokenOrRedirect(router)
      if (!accessToken) throw new Error('로그인이 필요합니다.')
      const response = await axios.get<ItemListResponse>(
        `${API_BASE_URL}/groups/${groupId}/items`,
        {
          params: { size: 10, cursor: pageParam },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal,
        },
      )
      return response.data.data
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
