'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import { useEffect, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import { LOGIN_PATH } from '@/utils/auth'

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
          message={AUTH_ERRORS.LOGIN_EXPIRED}
          confirmLabel="로그인"
          onConfirm={() => window.location.replace(LOGIN_PATH)}
        />
      )}
    </>
  )
}
