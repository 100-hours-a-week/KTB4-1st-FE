import type { ReactNode } from 'react'
import SupportWidgets from '@/components/common/chatbot/SupportWidgets'

export default function PagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SupportWidgets />
    </>
  )
}
