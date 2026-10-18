'use client'

import { useEffect, useRef, useState } from 'react'

export type CursorPage<T> = {
  items: T[]
  nextCursor: string | null
  hasNext: boolean
}

type CursorPaginationOptions<T> = {
  fetchPage: (
    cursor: string | null,
    signal: AbortSignal,
  ) => Promise<CursorPage<T>>
  getKey: (item: T) => string | number
  filter?: (item: T) => boolean
  pageSize?: number
  cursorErrorMessage?: string
}

const acceptAll = () => true

/** 요청 크기와 관계없이 pageSize개씩 표시하고 마지막 페이지에서 미리 조회합니다.
 * fetchPage, getKey, filter는 모듈 함수 또는 useCallback으로 참조를 유지해주세요.
 * 조회 조건이 바뀌면 사용하는 컴포넌트의 key를 바꿔 캐시와 페이지를 초기화합니다.
 */
export function useCursorPagination<T>({
  fetchPage,
  getKey,
  filter = acceptAll,
  pageSize = 5,
  cursorErrorMessage = '다음 페이지를 불러오지 못했습니다.',
}: CursorPaginationOptions<T>) {
  const cache = useRef({
    items: [] as T[],
    nextCursor: null as string | null,
    hasNext: true,
    initialized: false,
    seenCursors: new Set<string>(),
  })
  const [items, setItems] = useState<T[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [hasNext, setHasNext] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPages() {
      setIsLoading(true)
      setError(null)
      try {
        const requiredCount = (pageIndex + 1) * pageSize
        // 필터에서 제외되는 물품은 화면을 채우는 개수에 포함하지 않습니다.
        while (
          !cache.current.initialized ||
          (cache.current.hasNext &&
            cache.current.items.filter(filter).length <= requiredCount)
        ) {
          const page = await fetchPage(
            cache.current.nextCursor,
            controller.signal,
          )
          if (controller.signal.aborted) return
          if (
            page.hasNext &&
            (!page.nextCursor || cache.current.seenCursors.has(page.nextCursor))
          ) {
            throw new Error(cursorErrorMessage)
          }
          if (page.nextCursor) cache.current.seenCursors.add(page.nextCursor)
          const loadedKeys = new Set(cache.current.items.map(getKey))
          const newItems = page.items.filter((item) => {
            const key = getKey(item)
            if (loadedKeys.has(key)) return false
            loadedKeys.add(key)
            return true
          })
          cache.current = {
            ...cache.current,
            items: [...cache.current.items, ...newItems],
            nextCursor: page.nextCursor,
            hasNext: page.hasNext,
            initialized: true,
          }
          setItems(cache.current.items)
          setHasNext(page.hasNext)
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadPages()
    return () => controller.abort()
  }, [
    fetchPage,
    getKey,
    filter,
    pageSize,
    cursorErrorMessage,
    pageIndex,
    retryCount,
  ])

  const filteredItems = items.filter(filter)
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const canGoPrevious = pageIndex > 0
  const canGoNext = pageIndex + 1 < pageCount

  return {
    items,
    filteredItems,
    visibleItems: filteredItems.slice(
      pageIndex * pageSize,
      (pageIndex + 1) * pageSize,
    ),
    pageIndex,
    pageCount,
    hasNext,
    isLoading,
    isInitialLoading: isLoading && items.length === 0,
    error,
    canGoPrevious,
    canGoNext,
    goToPreviousPage: () => {
      if (canGoPrevious) setPageIndex((page) => page - 1)
    },
    goToNextPage: () => {
      if (canGoNext) setPageIndex((page) => page + 1)
    },
    retry: () => setRetryCount((count) => count + 1),
  }
}
