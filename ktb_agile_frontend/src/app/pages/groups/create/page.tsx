'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import AddressModal from './address/AddressModal'
import styles from './creategroup.module.css'

const GROUP_NAME_MAX_LENGTH = 30
const GROUP_DESCRIPTION_MAX_LENGTH = 300

export default function CreateGroup() {
  const router = useRouter()
  const [isSheetMounted, setIsSheetMounted] = useState(false)
  const [groupAddress, setGroupAddress] = useState<string | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupNameHelperText, setGroupNameHelperText] = useState<string | null>(
    null,
  )
  const [groupDescriptionHelperText, setGroupDescriptionHelperText] =
    useState<string | null>(null)

  return (
    <>
      <section className={styles.page} inert={isSheetMounted}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            {/* 뒤로가기 아이콘 */}
            <svg viewBox="0 0 24 24">
              <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
            </svg>
          </button>
          <h1 className={styles.title}>그룹</h1>
        </header>

        <div className={styles.content}>
          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>그룹 명</p>
            <input
              className={styles.textInput}
              type="text"
              value={groupName}
              maxLength={GROUP_NAME_MAX_LENGTH}
              placeholder="그룹명을 입력하세요"
              onChange={(event) => {
                const value = event.target.value
                setGroupName(value)
                setGroupNameHelperText(
                  value.length > GROUP_NAME_MAX_LENGTH
                    ? `그룹명은 ${GROUP_NAME_MAX_LENGTH}자 이내로 입력해주세요.`
                    : null,
                )
              }}
            />
            {groupNameHelperText !== null && (
              <p className={styles.helperText}>
                {groupNameHelperText}
              </p>
            )}
          </div>

          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>주소</p>
            <button
              className={styles.locationButton}
              type="button"
              onClick={() => setIsSheetMounted(true)}
            >
              건물 위치 가져오기
            </button>
            <div className={styles.locationInfo}>
              <strong>그룹 주소 :</strong>
              <span>{groupAddress ?? '주소를 가져오면 표시됩니다'}</span>
            </div>
          </div>

          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>그룹 설명</p>
            <p className={styles.optional}>선택사항</p>
            <textarea
              className={styles.descriptionInput}
              value={groupDescription}
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              placeholder="그룹 설명을 입력하세요"
              onChange={(event) => {
                const value = event.target.value
                setGroupDescription(value)
                setGroupDescriptionHelperText(
                  value.length > GROUP_DESCRIPTION_MAX_LENGTH
                    ? `그룹 설명은 ${GROUP_DESCRIPTION_MAX_LENGTH}자 이내로 입력해주세요.`
                    : null,
                )
              }}
            />
            {groupDescriptionHelperText !== null && (
              <p className={styles.helperText}>
                {groupDescriptionHelperText}
              </p>
            )}
          </div>

          <div className={styles.createArea}>
            <button className={styles.createButton} type="button">
              그룹 생성
            </button>
            <p className={styles.notice}>
              그룹 설정 사항은 추후 수정할 수 없습니다.
            </p>
          </div>
        </div>

        <Navbar />
      </section>
      {isSheetMounted && (
        <AddressModal
          onClose={() => setIsSheetMounted(false)}
          onSelect={(address) =>
            setGroupAddress(address.roadAddress ?? address.addressName)
          }
        />
      )}
    </>
  )
}
