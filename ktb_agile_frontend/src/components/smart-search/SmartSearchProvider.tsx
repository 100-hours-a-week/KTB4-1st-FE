'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SmartSearchRequest } from '@/types/smartSearch'

type SmartSearchItems = SmartSearchRequest['items']

type SmartSearchContextValue = {
  groupId: number | null
  items: SmartSearchItems
  preferenceText: string
  setGroupId: (groupId: number | null) => void
  setItems: (items: SmartSearchItems) => void
  setPreferenceText: (preferenceText: string) => void
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
  const [preferenceText, setPreferenceText] = useState('')

  const reset = useCallback(() => {
    setGroupId(null)
    setItems([])
    setPreferenceText('')
  }, [])

  const value = useMemo(
    () => ({
      groupId,
      items,
      preferenceText,
      setGroupId,
      setItems,
      setPreferenceText,
      reset,
    }),
    [groupId, items, preferenceText, reset],
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
    throw new Error('useSmartSearch는 SmartSearchProvider 안에서만 사용할 수 있습니다.')
  }

  return context
}
