import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PreferenceForm from './PreferenceForm'
import type { PreferenceAnswer } from '@/types/preference'

afterEach(cleanup)

const answers: PreferenceAnswer[] = [
  { question: 'CONVERSATION_STYLE', answer: 'CONCISE' },
  { question: 'DESCRIPTION_STYLE', answer: 'MODERATE' },
  { question: 'OPINION_STYLE', answer: 'INDIRECT' },
]

it('저장 중 재제출을 막고 실패 시 주입받은 문구를 표시하며 선택값을 유지한다', async () => {
  let rejectSave!: (error: Error) => void
  const onSubmit = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        rejectSave = reject
      }),
  )
  render(
    <PreferenceForm
      initialAnswers={answers}
      title="거래 취향 수정"
      submitLabel="저장"
      failureMessage="수정에 실패했어요. 다시 시도해주세요."
      onSubmit={onSubmit}
    />,
  )

  const saveButton = screen.getByRole('button', {
    name: '저장',
  }) as HTMLButtonElement
  fireEvent.click(saveButton)
  expect(saveButton.disabled).toBe(true)
  fireEvent.click(saveButton)
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(onSubmit).toHaveBeenCalledWith(answers)

  await act(async () => rejectSave(new Error('저장 실패')))
  expect(
    screen.getByText('수정에 실패했어요. 다시 시도해주세요.'),
  ).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(saveButton.disabled).toBe(false)
  expect(
    screen
      .getByRole('button', { name: '담백하게' })
      .getAttribute('aria-pressed'),
  ).toBe('true')
})

it('질문별 하나만 선택할 수 있고 세 질문에 모두 답해야 제출할 수 있다', () => {
  const onSubmit = vi.fn(async () => {})
  render(
    <PreferenceForm
      initialAnswers={[]}
      title="거래 취향 설정"
      submitLabel="완료"
      failureMessage="저장 실패"
      onSubmit={onSubmit}
    />,
  )
  const saveButton = screen.getByRole('button', {
    name: '완료',
  }) as HTMLButtonElement
  expect(saveButton.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '담백하게' }))
  fireEvent.click(screen.getByRole('button', { name: '따뜻하게' }))
  expect(
    screen
      .getByRole('button', { name: '담백하게' })
      .getAttribute('aria-pressed'),
  ).toBe('false')
  expect(screen.getByText('1 / 3 선택함')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: '적당히' }))
  expect(saveButton.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '완곡하게' }))
  expect(saveButton.disabled).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '완곡하게' }))
  expect(saveButton.disabled).toBe(true)
  expect(onSubmit).not.toHaveBeenCalled()
})
