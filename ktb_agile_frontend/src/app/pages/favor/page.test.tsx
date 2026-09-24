import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import axios, { type AxiosResponse } from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import PreferenceSetup from './page'

const replace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  replace.mockReset()
})

it('저장 실패 모달을 확인으로 닫고 재시도하면 선택값을 유지한 채 저장에 성공한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')

  const post = vi
    .spyOn(axios, 'post')
    .mockRejectedValueOnce(new Error('Temporary server error'))
    .mockResolvedValueOnce({ status: 201 } as AxiosResponse)

  const { container } = render(<PreferenceSetup />)

  fireEvent.click(screen.getByRole('button', { name: '담백하게' }))
  fireEvent.click(screen.getByRole('button', { name: '적당히' }))
  fireEvent.click(screen.getByRole('button', { name: '완곡하게' }))

  const completeButton = screen.getByRole('button', { name: '완료' })
  expect((completeButton as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(completeButton)

  const errorDialog = await screen.findByRole('dialog')
  expect(
    within(errorDialog).getByText(
      '서버 오류로 저장에 실패했습니다. 다시 시도해주세요',
    ),
  ).toBeDefined()
  expect(container.querySelector('section[inert]')).not.toBeNull()
  expect(replace).not.toHaveBeenCalled()

  fireEvent.click(within(errorDialog).getByRole('button', { name: '확인' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(container.querySelector('section[inert]')).toBeNull()

  for (const option of ['담백하게', '적당히', '완곡하게']) {
    expect(
      screen.getByRole('button', { name: option }).getAttribute('aria-pressed'),
    ).toBe('true')
  }
  expect(screen.getByText('3 / 3 선택함')).toBeDefined()
  expect(window.sessionStorage.getItem('accessToken')).toBe('test-token')

  fireEvent.click(completeButton)

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/pages/groups'))
  expect(post).toHaveBeenCalledTimes(2)

  const expectedAnswers = [
    { question: 'CONVERSATION_STYLE', answer: 'CONCISE' },
    { question: 'DESCRIPTION_STYLE', answer: 'MODERATE' },
    { question: 'OPINION_STYLE', answer: 'INDIRECT' },
  ]

  for (const attempt of [1, 2]) {
    expect(post).toHaveBeenNthCalledWith(
      attempt,
      'http://127.0.0.1:8080/users/preferences',
      { answers: expectedAnswers },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  }
})
