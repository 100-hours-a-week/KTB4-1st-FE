'use client'

import { useState } from 'react'
import DeleteAccountUnavailableModal from './DeleteAccountUnavailableModal'
import styles from './DeleteAccountAction.module.css'

export default function DeleteAccountAction() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  function closeModal() {
    // TODO: 회원 탈퇴 기능을 지원할 때 별도 API 호출과 토큰 삭제, 로그인 화면 이동을 연결합니다.
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        className={styles.deleteAccount}
        type="button"
        onClick={() => setIsModalOpen(true)}
      >
        탈퇴하기
      </button>
      {isModalOpen && (
        <DeleteAccountUnavailableModal onClose={closeModal} />
      )}
    </>
  )
}
