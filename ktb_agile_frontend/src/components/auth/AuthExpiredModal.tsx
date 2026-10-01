'use client'

import { useEffect, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'

export default function AuthExpiredModal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function showModal() {
      setIsOpen(true)
    }

    window.addEventListener('auth-expired', showModal)
    return () => window.removeEventListener('auth-expired', showModal)
  }, [])

  return (
    <>
      {children}
      {isOpen && (
        <ModalDefault
          message="로그인이 만료되었습니다. 다시 로그인해주세요."
          confirmLabel="로그인"
          onConfirm={() => window.location.replace('/auth/login')}
        />
      )}
    </>
  )
}
