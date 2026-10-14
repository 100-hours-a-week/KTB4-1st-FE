'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import styles from './DeleteAccountAction.module.css'

export default function DeleteAccountAction() {
  const router = useRouter()
  const [modal, setModal] = useState<'confirm' | 'error' | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!modal) return

    const appShell = document.querySelector('.app-shell')
    appShell?.setAttribute('inert', '')

    return () => appShell?.removeAttribute('inert')
  }, [modal])

  async function deleteAccount() {
    if (isDeleting) return

    setIsDeleting(true)
    try {
      const accessToken = window.sessionStorage.getItem('accessToken')

      const response = await fetch('/bff/users/me', {
        method: 'DELETE',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          Accept: 'application/json',
        },
      })

      if (response.status !== 204) throw new Error('Account deletion failed')

      window.sessionStorage.removeItem('accessToken')
      setModal(null)
      router.replace('/auth/login')
    } catch {
      setModal('error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        className={styles.deleteAccount}
        type="button"
        onClick={() => setModal('confirm')}
      >
        탈퇴하기
      </button>
      {modal === 'confirm' &&
        createPortal(
          <ModalDefault
            message="정말 탈퇴하시겠습니까?"
            confirmLabel={isDeleting ? '처리 중...' : '탈퇴하기'}
            onConfirm={() => void deleteAccount()}
            onCancel={() => setModal(null)}
            confirmDisabled={isDeleting}
            cancelDisabled={isDeleting}
          />,
          document.body,
        )}
      {modal === 'error' &&
        createPortal(
          <ModalDefault
            message="탈퇴에 실패했습니다. 조금 후에 다시 시도해주세요"
            onConfirm={() => setModal(null)}
          />,
          document.body,
        )}
    </>
  )
}
