'use client'

import axios from 'axios'
import { useCallback } from 'react'
import '@/config/api'
import { useCursorPagination } from '@/hooks/useCursorPagination'
import type { MyItemListItem, MyItemListResponse } from '@/types/item'
import { isItemAvailable } from '@/utils/item'

const DEFAULT_ERROR_MESSAGE = '내 물품을 불러오지 못했습니다.'

const getItemKey = (item: MyItemListItem) => item.itemId

// 교환 가능한 물품을 앞에 둡니다. 같은 상태끼리는 서버 순서를 유지합니다.
const availableFirst = (a: MyItemListItem, b: MyItemListItem) =>
  Number(isItemAvailable(b)) - Number(isItemAvailable(a))

type UseMyGroupItemsOptions = {
  groupId: number
  /** true면 교환 가능한 물품만, false면 전체 물품을 교환 가능한 순으로 보여줍니다. */
  availableOnly?: boolean
  errorMessage?: string
  onPageLoaded?: (items: MyItemListItem[]) => void
}

/** 선택한 그룹에 등록한 내 물품만 페이지 단위로 보여줍니다.
 * 그룹이 바뀌면 사용하는 컴포넌트의 key를 groupId로 바꿔 목록과 페이지를 초기화합니다.
 * onPageLoaded는 useCallback 또는 state setter처럼 참조가 유지되는 함수를 넘겨주세요.
 */
export function useMyGroupItems({
  groupId,
  availableOnly = false,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  onPageLoaded,
}: UseMyGroupItemsOptions) {
  const fetchPage = useCallback(
    async (cursor: string | null, signal: AbortSignal) => {
      const response = await axios.get<MyItemListResponse>('/bff/my-items', {
        params: { groupId, ...(cursor ? { cursor } : {}) },
        headers: { Accept: 'application/json' },
        signal,
      })
      const page = response.data.data
      if (!page || response.data.error) {
        throw new Error(response.data.error?.message || errorMessage)
      }
      if (!signal.aborted) onPageLoaded?.(page.items)
      return page
    },
    [groupId, errorMessage, onPageLoaded],
  )
  const filter = useCallback(
    (item: MyItemListItem) =>
      item.groups.some((group) => group.groupId === groupId) &&
      (!availableOnly || isItemAvailable(item)),
    [groupId, availableOnly],
  )
  const pagination = useCursorPagination({
    fetchPage,
    getKey: getItemKey,
    filter,
    sort: availableOnly ? undefined : availableFirst,
    cursorErrorMessage: errorMessage,
  })
  const { error } = pagination

  return {
    ...pagination,
    errorMessage: error
      ? axios.isAxiosError<MyItemListResponse>(error)
        ? error.response?.data.error?.message || errorMessage
        : error instanceof Error
          ? error.message
          : errorMessage
      : null,
  }
}
