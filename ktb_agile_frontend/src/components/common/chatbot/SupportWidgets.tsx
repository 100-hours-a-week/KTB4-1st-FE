'use client'

import { useRef } from 'react'
import { usePathname } from 'next/navigation'
import ChatbotButton from './ChatbotButton'
import FloatingInquiryButton, {
  type InquiryButtonHandle,
} from '@/components/common/inquiry/FloatingInquiryButton'

export default function SupportWidgets() {
  const inquiryRef = useRef<InquiryButtonHandle>(null)
  const pathname = usePathname()
  const aboveComposer = /^\/pages\/chat\/\d+$/.test(pathname)

  return (
    <>
      <FloatingInquiryButton ref={inquiryRef} aboveComposer={aboveComposer} />
      <ChatbotButton
        aboveComposer={aboveComposer}
        onInquiry={() => inquiryRef.current?.openFromChatbot()}
      />
    </>
  )
}
