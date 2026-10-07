'use client'

import styles from './LeaveModal.module.css'

type LeaveFinalConfirmModalProps = {
  groupName: string
  isLastMember: boolean
  isLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function LeaveFinalConfirmModal({
  groupName,
  isLastMember,
  isLoading,
  onCancel,
  onConfirm,
}: LeaveFinalConfirmModalProps) {
  return (
    <div className={styles.overlay}>
      <section className={styles.modal}>
        <div className={styles.content}>
          <h2 className={styles.title}>
            {isLastMember ? '그룹을 삭제하시겠습니까?' : '그룹을 탈퇴하시겠습니까?'}
          </h2>
          <p className={styles.description}>
            {isLastMember
              ? `${groupName}의 마지막 멤버입니다. 탈퇴하면 그룹과 그룹에 포함된 데이터가 삭제되며 복구할 수 없습니다.`
              : `${groupName}에서 탈퇴하시겠습니까? 탈퇴 후에는 그룹에 다시 참여할 수 있습니다.`}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.leaveButton}`}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : '탈퇴하기'}
          </button>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </button>
        </div>
      </section>
    </div>
  )
}
