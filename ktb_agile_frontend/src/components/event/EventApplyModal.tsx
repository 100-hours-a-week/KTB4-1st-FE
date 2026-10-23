'use client'

import axios from 'axios'
import { useEffect, useState, type ChangeEvent } from 'react'
import ArrowLeftIcon from './ArrowLeftIcon'
import styles from './EventApplyModal.module.css'

type EventApplyModalProps = {
  isSeller: boolean
  otherUser: string
  requestedItemTitle: string
  offeredItemTitles: string
  isSubmitting: boolean
  error: string
  onApply: (photo: File) => void
  onClose: () => void
}

const MY_NICKNAME_FALLBACK = '나'
const MAX_LABEL_LENGTH = 7

// 박스 너비가 고정이라 7글자를 넘으면 말줄임표로 줄입니다.
function truncate(text: string) {
  const chars = Array.from(text)
  return chars.length > MAX_LABEL_LENGTH
    ? `${chars.slice(0, MAX_LABEL_LENGTH).join('')}...`
    : text
}

export default function EventApplyModal({
  isSeller,
  otherUser,
  requestedItemTitle,
  offeredItemTitles,
  isSubmitting,
  error,
  onApply,
  onClose,
}: EventApplyModalProps) {
  const [myNickname, setMyNickname] = useState(MY_NICKNAME_FALLBACK)
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(
    null,
  )
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    // 모달이 떠 있는 동안 뒷배경 스크롤을 막습니다.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) return

    const controller = new AbortController()
    axios
      .get<{ data: { nickname?: string } | null }>('/bff/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      })
      .then((response) => {
        const nickname = response.data.data?.nickname?.trim()
        if (nickname) setMyNickname(nickname)
      })
      .catch(() => {
        // 내 닉네임을 가져오지 못해도 기본 표기로 계속 진행합니다.
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const previewUrl = photo?.previewUrl
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [photo?.previewUrl])

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화합니다.
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('JPG, PNG, WebP 사진을 등록해주세요.')
      return
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setPhotoError('사진은 0바이트 초과, 10MB 이하로 등록해주세요.')
      return
    }
    setPhotoError('')
    setPhoto({ file, previewUrl: URL.createObjectURL(file) })
  }

  const receiver = isSeller ? myNickname : otherUser
  const requester = isSeller ? otherUser : myNickname

  return (
    <div className={styles.overlay}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="이벤트 응모"
      >
        <header className={styles.header}>
          <h2 className={styles.title}>이벤트 응모하기</h2>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="닫기"
            disabled={isSubmitting}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <dl className={styles.infoCard}>
            <div className={styles.infoRow}>
              <dt>교환자</dt>
              <dd className={styles.names}>
                <span className={styles.nameBox} title={receiver}>
                  {truncate(receiver)}
                </span>
                <span className={styles.nameBox} title={requester}>
                  {truncate(requester)}
                </span>
              </dd>
            </div>
            <div className={styles.infoRow}>
              <dt>교환물품</dt>
              <dd className={styles.items}>
                <span className={styles.itemChip} title={requestedItemTitle}>
                  {truncate(requestedItemTitle)}
                </span>
                <span className={styles.arrowBadge}>
                  <ArrowLeftIcon className={styles.arrow} />
                </span>
                <span className={styles.itemChip} title={offeredItemTitles}>
                  {truncate(offeredItemTitles)}
                </span>
              </dd>
            </div>
          </dl>

          <div className={styles.photoSection}>
            <label className={styles.photoButton}>
              <input
                className={styles.photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSubmitting}
                onChange={handlePhotoChange}
              />
              <CameraIcon className={styles.cameraIcon} />
              교환 인증 사진 등록하기
            </label>
            <div
              className={`${styles.thumbnailBox} ${photo ? styles.thumbnailFilled : ''}`}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.thumbnail}
                  src={photo.previewUrl}
                  alt="등록한 교환 인증 사진"
                />
              ) : (
                <span className={styles.thumbnailHint}>사진 미리보기</span>
              )}
            </div>
            {photo && (
              <button
                className={styles.removeButton}
                type="button"
                disabled={isSubmitting}
                onClick={() => setPhoto(null)}
              >
                사진 삭제
              </button>
            )}
          </div>

          {(photoError || error) && <p role="alert">{photoError || error}</p>}
          <button
            className={styles.applyButton}
            type="button"
            disabled={!photo || isSubmitting || !!photoError}
            onClick={() => photo && onApply(photo.file)}
          >
            {isSubmitting ? '응모 중...' : '응모하기'}
          </button>
        </div>
      </section>
    </div>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
