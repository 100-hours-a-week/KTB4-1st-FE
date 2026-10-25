'use client'

import { PREFERENCE_ERRORS } from '@/constants/errors/preference'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import styles from './favor.module.css'
import axios from 'axios'
import { getAccessTokenOrRedirect, redirectToLogin } from '@/utils/auth'
import '@/config/api'

const preferenceQuestions = [
  {
    value: 'CONVERSATION_STYLE',
    label: '대화 방식',
    options: [
      { value: 'CONCISE', label: '담백하게' },
      { value: 'COMFORTABLE', label: '편안하게' },
      { value: 'WARM', label: '따뜻하게' },
    ],
  },
  {
    value: 'DESCRIPTION_STYLE',
    label: '설명 방식',
    options: [
      { value: 'BRIEF', label: '핵심만 짧게' },
      { value: 'MODERATE', label: '적당히' },
      { value: 'DETAILED', label: '충분히 설명' },
    ],
  },
  {
    value: 'OPINION_STYLE',
    label: '의견 표현 방식',
    options: [
      { value: 'CLEAR', label: '분명하게' },
      { value: 'NATURAL', label: '자연스럽게' },
      { value: 'INDIRECT', label: '완곡하게' },
    ],
  },
] as const

type PreferenceQuestion = (typeof preferenceQuestions)[number]['value']
type PreferenceOption =
  (typeof preferenceQuestions)[number]['options'][number]['value']

type PreferenceAnswer = {
  question: PreferenceQuestion
  answer: PreferenceOption
}

export default function PreferenceSetup() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferenceStatus, setPreferenceStatus] = useState<
    'checking' | 'available' | 'exists' | 'failed'
  >('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<PreferenceAnswer[]>([])

  useEffect(() => {
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    const controller = new AbortController()
    async function checkPreferences() {
      try {
        await axios.get('/bff/preferences', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setPreferenceStatus('exists')
      } catch (error) {
        if (controller.signal.aborted) return
        setPreferenceStatus(
          axios.isAxiosError(error) && error.response?.status === 404
            ? 'available'
            : 'failed',
        )
      }
    }

    void checkPreferences()
    return () => controller.abort()
  }, [router])

  const selectedCount = selectedAnswers.length
  const isComplete = selectedCount === preferenceQuestions.length
  const progress = (selectedCount / preferenceQuestions.length) * 100

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
    if (preferenceStatus !== 'available') return
    const result = selectedAnswers.map((v) => v)
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await axios.post(
        '/bff/preferences',
        { answers: result },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      
      router.replace('/pages/items')
    } catch {
      setErrorMessage(PREFERENCE_ERRORS.SAVE_FAILED)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section
        className={styles.page}
        inert={
          preferenceStatus !== 'available' || errorMessage !== null
            ? true
            : undefined
        }
      >
        <header className={styles.header}>
          <h1 className={styles.title}>거래 취향 설정</h1>

          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="거래 취향 설정 진행률"
            aria-valuemin={0}
            aria-valuemax={preferenceQuestions.length}
            aria-valuenow={selectedCount}
          >
            <span
              className={styles.progressValue}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={styles.progressText} aria-live="polite">
            {selectedCount} / {preferenceQuestions.length} 선택함
          </p>
        </header>

        <div className={styles.questions}>
          {preferenceQuestions.map((question) => (
            <fieldset className={styles.question} key={question.value}>
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
            disabled={
              !isComplete || isSubmitting || preferenceStatus !== 'available'
            }
            onClick={submitResult}
          >
            완료
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
            if(errorMessage.includes('로그인')) redirectToLogin(router)
          }}
        />
      )}
      {preferenceStatus === 'exists' && (
        <ModalDefault
          message="취향 설문을 이미 작성하셨습니다. 추가로 작성할 수 없습니다. 수정은 추후 마이페이지에서 가능합니다."
          onConfirm={() => router.replace('/pages/items')}
        />
      )}
      {preferenceStatus === 'failed' && (
        <ModalDefault
          message="취향 설문을 확인하지 못했습니다. 다시 접속해주세요."
          onConfirm={() => router.replace('/pages/items')}
        />
      )}
    </>
  )
}
