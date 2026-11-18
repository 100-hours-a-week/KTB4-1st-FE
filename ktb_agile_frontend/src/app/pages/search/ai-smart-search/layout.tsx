import type { ReactNode } from 'react'
import AiFeatureGuard from '@/components/common/AiFeatureGuard'
import SmartSearchProvider from '@/components/smart-search/SmartSearchProvider'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AiFeatureGuard>
      <SmartSearchProvider>{children}</SmartSearchProvider>
    </AiFeatureGuard>
  )
}
