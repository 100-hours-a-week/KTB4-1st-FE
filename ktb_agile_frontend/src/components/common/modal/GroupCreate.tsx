'use client'

import styles from './GroupCreate.module.css'

export type GroupCreateProps = {
  groupName: string
  location: string | null
  groupDescription: string | null
  onCancel?: () => void
  onConfirm?: () => void
}

export default function ModalGroupCreate({
  groupName,
  location,
  groupDescription,
  onCancel,
  onConfirm,
}: GroupCreateProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <h2 className={styles.title}>그룹을 생성하시겠습니까?</h2>

          <div className={styles.groupInfo}>
            <div className={styles.infoItem}>
              <p className={styles.label}>그룹명</p>
              <p className={styles.value}>{groupName}</p>
            </div>

            <div className={styles.infoItem}>
              <p className={styles.label}>위치</p>
              <p className={styles.value}>{location}</p>
            </div>

            <div className={styles.infoItem}>
              <p className={styles.label}>그룹 설명</p>
              <p className={styles.value}>{groupDescription}</p>
            </div>
          </div>

          <p className={styles.notice}>
            그룹 설정 사항은 추후 수정할 수 없습니다.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className={`${styles.button} ${styles.confirmButton}`}
            type="button"
            onClick={onConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
