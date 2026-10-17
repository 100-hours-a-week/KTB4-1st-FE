'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type { ItemListItem } from '@/types/item'
import type { SmartSearchRequest } from '@/types/smartSearch'

type SmartSearchItems = SmartSearchRequest['items']

type SmartSearchContextValue = {
  groupId: number | null
  items: SmartSearchItems
  itemTitles: Record<number, string>
  setItemTitles: Dispatch<SetStateAction<Record<number, string>>>
  preferenceText: string
  // null은 아직 검색하지 않은 상태, []는 검색했지만 결과가 없는 상태
  results: ItemListItem[] | null
  setGroupId: (groupId: number | null) => void
  setItems: (items: SmartSearchItems) => void
  setPreferenceText: (preferenceText: string) => void
  setResults: (results: ItemListItem[] | null) => void
  reset: () => void
}

const SmartSearchContext = createContext<SmartSearchContextValue | null>(null)

// ai-smart-search 하위 페이지를 오가도 검색 입력값이 유지되도록 layout에서 감쌉니다.
export default function SmartSearchProvider({
  children,
}: {
  children: ReactNode
}) {
  const [groupId, setGroupId] = useState<number | null>(null)
  const [items, setItems] = useState<SmartSearchItems>([])
  const [itemTitles, setItemTitles] = useState<Record<number, string>>({})
  const [preferenceText, setPreferenceText] = useState('')
  const [results, setResults] = useState<ItemListItem[] | null>(null)

  const reset = useCallback(() => {
    setGroupId(null)
    setItems([])
    setItemTitles({})
    setPreferenceText('')
    setResults(null)
  }, [])

  const value = useMemo(
    () => ({
      groupId,
      items,
      itemTitles,
      setItemTitles,
      preferenceText,
      results,
      setGroupId,
      setItems,
      setPreferenceText,
      setResults,
      reset,
    }),
    [groupId, items, itemTitles, preferenceText, results, reset],
  )

  return (
    <SmartSearchContext.Provider value={value}>
      {children}
    </SmartSearchContext.Provider>
  )
}

export function useSmartSearch() {
  const context = useContext(SmartSearchContext)

  if (!context) {
    throw new Error(
      'useSmartSearch는 SmartSearchProvider 안에서만 사용할 수 있습니다.',
    )
  }

  return context
}
