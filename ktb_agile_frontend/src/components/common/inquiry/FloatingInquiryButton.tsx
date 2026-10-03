'use client'

import { INQUIRY_ERRORS } from '@/constants/errors/inquiry'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ModalDefault from '@/components/common/modal/Default'
import styles from './FloatingInquiryButton.module.css'

type FloatingInquiryButtonProps = {
  aboveComposer?: boolean
}

type InquiryType = 'INQUIRY' | 'BUG_REPORT'

export default function FloatingInquiryButton({
  aboveComposer = false,
}: FloatingInquiryButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<InquiryType>('INQUIRY')
  const [content, setContent] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()

    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  function openModal() {
    setType('INQUIRY')
    setContent('')
    setNotice('')
    setIsSubmitted(false)
    setIsOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!content.trim() || isSubmitting || isSubmitted) return

    setIsSubmitting(true)
    setNotice('')
    try {
      const response = await fetch('/bff/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, content: content.trim() }),
      })
      if (!response.ok) {
        const result = (await response.json()) as { message?: string }
        setNotice(result.message || INQUIRY_ERRORS.CLIENT_SUBMIT_FAILED)
        return
      }
      setIsSubmitted(true)
      setIsOpen(false)
    } catch {
      setNotice(INQUIRY_ERRORS.CLIENT_SUBMIT_FAILED)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div
        className={`${styles.container} ${aboveComposer ? styles.aboveComposer : ''}`}
      >
        <button className={styles.button} type="button" onClick={openModal}>
          문의
        </button>
      </div>
      {isSubmitted && (
        <ModalDefault
          message="등록이 완료되었습니다."
          onConfirm={() => setIsSubmitted(false)}
        />
      )}
      {isOpen &&
        createPortal(
          <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="inquiry-title"
            onClose={() => setIsOpen(false)}
            onCancel={(event) => {
              if (isSubmitting) event.preventDefault()
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget && !isSubmitting) {
                setIsOpen(false)
              }
            }}
          >
            <div className={styles.modal}>
              <div className={styles.heading}>
                <div>
                  <h2 id="inquiry-title" className={styles.title}>
                    문의하기
                  </h2>
                  <p className={styles.description}>
                    문의나 오류 내용을 남겨주세요.
                  </p>
                </div>
                <button
                  className={styles.closeButton}
                  type="button"
                  aria-label="문의창 닫기"
                  disabled={isSubmitting}
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <fieldset className={styles.typeFieldset}>
                  <legend className={styles.label}>글 유형</legend>
                  <div className={styles.typeOptions}>
                    <label className={styles.typeOption}>
                      <input
                        type="radio"
                        name="inquiry-type"
                        value="INQUIRY"
                        checked={type === 'INQUIRY'}
                        disabled={isSubmitting || isSubmitted}
                        onChange={() => setType('INQUIRY')}
                      />
                      문의글
                    </label>
                    <label className={styles.typeOption}>
                      <input
                        type="radio"
                        name="inquiry-type"
                        value="BUG_REPORT"
                        checked={type === 'BUG_REPORT'}
                        disabled={isSubmitting || isSubmitted}
                        onChange={() => setType('BUG_REPORT')}
                      />
                      오류 리포트
                    </label>
                  </div>
                </fieldset>
                <label className={styles.label} htmlFor="inquiry-content">
                  내용
                </label>
                <textarea
                  id="inquiry-content"
                  className={styles.textarea}
                  value={content}
                  maxLength={500}
                  disabled={isSubmitting || isSubmitted}
                  placeholder="문의하거나 제보할 내용을 작성해주세요."
                  onChange={(event) => {
                    setContent(event.target.value)
                    setNotice('')
                  }}
                />
                <p className={styles.counter}>{content.length} / 500</p>
                {notice && (
                  <p className={styles.error} role="alert">
                    {notice}
                  </p>
                )}
                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={!content.trim() || isSubmitting}
                >
                  {isSubmitting ? '등록 중...' : '등록'}
                </button>
              </form>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
