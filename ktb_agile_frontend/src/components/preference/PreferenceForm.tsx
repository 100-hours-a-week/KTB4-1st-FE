'use client'

import { useRef, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import styles from './PreferenceForm.module.css'
import { PREFERENCE_QUESTIONS } from '@/constants/preference'
import type {
  PreferenceAnswer,
  PreferenceQuestion,
  PreferenceOption,
} from '@/types/preference'

type PreferenceFormProps = {
  initialAnswers: PreferenceAnswer[]
  title: string
  submitLabel: string
  failureMessage: string
  onSubmit: (answers: PreferenceAnswer[]) => Promise<void>
}

export default function PreferenceForm({
  initialAnswers,
  title,
  submitLabel,
  failureMessage,
  onSubmit,
}: PreferenceFormProps) {
  const [selectedAnswers, setSelectedAnswers] = useState(initialAnswers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const selectedCount = selectedAnswers.length
  const isComplete = selectedCount === PREFERENCE_QUESTIONS.length
  const progress = (selectedCount / PREFERENCE_QUESTIONS.length) * 100

  function toggleAnswer(
    question: PreferenceQuestion,
    answer: PreferenceOption,
  ) {
    setSelectedAnswers((currentAnswers) => {
      const selectedIndex = currentAnswers.findIndex(
        (item) => item.question === question,
      )
      const selectedAnswer = currentAnswers[selectedIndex]

      if (selectedAnswer?.answer === answer) {
        return currentAnswers.filter((_, index) => index !== selectedIndex)
      }

      if (selectedIndex === -1) {
        return [...currentAnswers, { question, answer }]
      }

      return currentAnswers.map((item, index) =>
        index === selectedIndex ? { question, answer } : item,
      )
    })
  }

  async function submitResult() {
    if (!isComplete || submitting.current) return
    submitting.current = true
    setIsSubmitting(true)
    try {
      await onSubmit(selectedAnswers)
    } catch {
      setErrorMessage(failureMessage)
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section
        className={styles.page}
        inert={isSubmitting || errorMessage !== null ? true : undefined}
      >
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>

          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="거래 취향 설정 진행률"
            aria-valuemin={0}
            aria-valuemax={PREFERENCE_QUESTIONS.length}
            aria-valuenow={selectedCount}
          >
            <span
              className={styles.progressValue}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={styles.progressText} aria-live="polite">
            {selectedCount} / {PREFERENCE_QUESTIONS.length} 선택함
          </p>
        </header>

        <div className={styles.questions}>
          {PREFERENCE_QUESTIONS.map((question) => (
            <fieldset
              className={styles.question}
              key={question.value}
              disabled={isSubmitting}
            >
              <legend className={styles.questionTitle}>{question.label}</legend>

              <div className={styles.options}>
                {question.options.map((option) => {
                  const isSelected = selectedAnswers.some(
                    (item) =>
                      item.question === question.value &&
                      item.answer === option.value,
                  )

                  return (
                    <button
                      className={`${styles.optionButton} ${
                        isSelected ? styles.selected : ''
                      }`}
                      type="button"
                      key={option.value}
                      aria-pressed={isSelected}
                      data-question={question.value}
                      data-option={option.value}
                      onClick={() => toggleAnswer(question.value, option.value)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <p className={styles.information}>
          회원님의 물건 정보, 거래 조건, 채팅 내용은 매칭과 원활한 거래 진행을
          위해 사용돼요. 대화 스타일 정보는 상대방이 회원님과의 메시지를 추천할
          때 AI가 참고하는 데 쓰일 수 있어요.
        </p>

        <footer className={styles.footer}>
          <button
            className={styles.completeButton}
            type="button"
            disabled={!isComplete || isSubmitting}
            onClick={submitResult}
          >
            {submitLabel}
          </button>

          {!isComplete && (
            <p className={styles.helperText} aria-live="polite">
              3개 모두 선택하면 완료할 수 있어요
            </p>
          )}
        </footer>
      </section>

      {errorMessage !== null && (
        <ModalDefault
          message={errorMessage}
          onConfirm={() => {
            setErrorMessage(null)
          }}
        />
      )}
    </>
  )
}
