'use client'

import styles from './LeaveModal.module.css'

type LeaveConfirmModalProps = {
  groupName: string
  onCancel: () => void
  onConfirm: () => void
}

export default function LeaveConfirmModal({
  groupName,
  onCancel,
  onConfirm,
}: LeaveConfirmModalProps) {
  return (
    <div className={styles.overlay}>
      <section className={styles.modal}>
        <div className={styles.content}>
          <h2 className={styles.title}>그룹을 탈퇴하시겠습니까?</h2>
          <p className={styles.description}>
            {groupName}에서 탈퇴합니다. 그룹에 게시한 물품은 모두 삭제가 되며,
            그룹이 삭제됐을 시 재참여는 불가합니다.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.leaveButton}`} type="button" onClick={onConfirm}>
            탈퇴하기
          </button>
          <button className={`${styles.button} ${styles.cancelButton}`} type="button" onClick={onCancel}>
            취소
          </button>
        </div>
      </section>
    </div>
  )
}
