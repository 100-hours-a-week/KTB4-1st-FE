import type { ReactNode } from 'react'
import SmartSearchProvider from '@/components/smart-search/SmartSearchProvider'

export default function Layout({ children }: { children: ReactNode }) {
  return <SmartSearchProvider>{children}</SmartSearchProvider>
}
