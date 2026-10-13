import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios, { AxiosError, type AxiosResponse } from 'axios'
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
  vi.spyOn(axios, 'get').mockRejectedValue(
    new AxiosError('Not found', undefined, undefined, undefined, {
      status: 404,
    } as AxiosResponse),
  )

  const post = vi
    .spyOn(axios, 'post')
    .mockRejectedValueOnce(new Error('Temporary server error'))
    .mockResolvedValueOnce({ status: 201 } as AxiosResponse)

  const { container } = render(<PreferenceSetup />)

  await waitFor(() =>
    expect(container.querySelector('section[inert]')).toBeNull(),
  )

  fireEvent.click(screen.getByRole('button', { name: '담백하게' }))
  fireEvent.click(screen.getByRole('button', { name: '적당히' }))
  fireEvent.click(screen.getByRole('button', { name: '완곡하게' }))

  const completeButton = screen.getByRole('button', { name: '완료' })
  expect((completeButton as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(completeButton)

  const errorMessage = '서버 오류로 저장에 실패했습니다. 다시 시도해주세요'
  expect(await screen.findByText(errorMessage)).toBeDefined()
  expect(container.querySelector('section[inert]')).not.toBeNull()
  expect(replace).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  await waitFor(() => expect(screen.queryByText(errorMessage)).toBeNull())
  expect(container.querySelector('section[inert]')).toBeNull()

  for (const option of ['담백하게', '적당히', '완곡하게']) {
    expect(
      screen.getByRole('button', { name: option }).getAttribute('aria-pressed'),
    ).toBe('true')
  }
  expect(screen.getByText('3 / 3 선택함')).toBeDefined()
  expect(window.sessionStorage.getItem('accessToken')).toBe('test-token')

  fireEvent.click(completeButton)

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/pages/items'))
  expect(post).toHaveBeenCalledTimes(2)

  const expectedAnswers = [
    { question: 'CONVERSATION_STYLE', answer: 'CONCISE' },
    { question: 'DESCRIPTION_STYLE', answer: 'MODERATE' },
    { question: 'OPINION_STYLE', answer: 'INDIRECT' },
  ]

  for (const attempt of [1, 2]) {
    expect(post).toHaveBeenNthCalledWith(
      attempt,
      '/bff/preferences',
      { answers: expectedAnswers },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    )
  }
})

it('이미 취향 설문이 있으면 안내 모달을 보여주고 확인 시 물품 목록으로 이동한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  const get = vi
    .spyOn(axios, 'get')
    .mockResolvedValue({ status: 200 } as AxiosResponse)
  const post = vi.spyOn(axios, 'post')

  const { container } = render(<PreferenceSetup />)

  expect(
    await screen.findByText(
      '취향 설문을 이미 작성하셨습니다. 추가로 작성할 수 없습니다.',
    ),
  ).toBeDefined()
  expect(container.querySelector('section[inert]')).not.toBeNull()
  expect(get).toHaveBeenCalledWith(
    '/bff/preferences',
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    }),
  )
  expect(post).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(replace).toHaveBeenCalledWith('/pages/items')
})
