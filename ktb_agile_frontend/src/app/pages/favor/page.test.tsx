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

function preferenceNotFoundError() {
  return new AxiosError('Not Found', undefined, undefined, undefined, {
    status: 404,
    data: {
      data: null,
      error: {
        code: 'USER_PREFERENCE_NOT_FOUND',
        message: '사용자 취향이 설정되지 않았습니다.',
        details: [],
      },
    },
  } as AxiosResponse)
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  replace.mockReset()
  window.history.replaceState({}, '', '/')
})

it('저장 실패 모달을 확인으로 닫고 재시도하면 선택값을 유지한 채 저장에 성공한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'get').mockRejectedValue(preferenceNotFoundError())

  const post = vi
    .spyOn(axios, 'post')
    .mockRejectedValueOnce(new Error('Temporary server error'))
    .mockResolvedValueOnce({ status: 201 } as AxiosResponse)

  const { container } = render(<PreferenceSetup />)

  await screen.findByRole('heading', { name: '거래 취향 설정' })

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

it('기존 취향이 있으면 별도 모드 없이 답변을 표시하고 PUT으로 저장한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: {
      data: {
        answers: [
          { question: 'CONVERSATION_STYLE', answer: 'CONCISE' },
          { question: 'DESCRIPTION_STYLE', answer: 'MODERATE' },
          { question: 'OPINION_STYLE', answer: 'INDIRECT' },
        ],
      },
    },
  })
  const put = vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  const post = vi.spyOn(axios, 'post')
  render(<PreferenceSetup />)

  await screen.findByRole('heading', { name: '거래 취향 수정' })
  for (const option of ['담백하게', '적당히', '완곡하게']) {
    expect(
      screen.getByRole('button', { name: option }).getAttribute('aria-pressed'),
    ).toBe('true')
  }
  fireEvent.click(screen.getByRole('button', { name: '따뜻하게' }))
  fireEvent.click(screen.getByRole('button', { name: '저장' }))

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/pages/my'))
  expect(put).toHaveBeenCalledWith(
    '/bff/preferences',
    {
      answers: [
        { question: 'CONVERSATION_STYLE', answer: 'WARM' },
        { question: 'DESCRIPTION_STYLE', answer: 'MODERATE' },
        { question: 'OPINION_STYLE', answer: 'INDIRECT' },
      ],
    },
    expect.any(Object),
  )
  expect(post).not.toHaveBeenCalled()
})

it.each([
  null,
  { data: null, error: null },
  { data: { answers: [] }, error: null },
])('GET 성공 응답이 비어 있으면 등록을 허용한다: %j', async (data) => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'get').mockResolvedValue({ data })
  render(<PreferenceSetup />)
  await screen.findByRole('heading', { name: '거래 취향 설정' })
  expect(screen.getByText('0 / 3 선택함')).toBeDefined()
  expect(
    (screen.getByRole('button', { name: '완료' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
})

it('취향 미설정 404(USER_PREFERENCE_NOT_FOUND)면 빈 등록 화면을 열고 POST로 저장한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'get').mockRejectedValue(preferenceNotFoundError())
  const post = vi
    .spyOn(axios, 'post')
    .mockResolvedValue({ status: 201 } as AxiosResponse)
  const put = vi.spyOn(axios, 'put')
  render(<PreferenceSetup />)

  await screen.findByRole('heading', { name: '거래 취향 설정' })
  expect(screen.getByText('0 / 3 선택함')).toBeDefined()
  for (const option of ['편안하게', '핵심만 짧게', '분명하게']) {
    fireEvent.click(screen.getByRole('button', { name: option }))
  }
  fireEvent.click(screen.getByRole('button', { name: '완료' }))

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/pages/items'))
  expect(post).toHaveBeenCalledTimes(1)
  expect(put).not.toHaveBeenCalled()
})

// 오류 코드 없는 404(경로 오류 등)는 미설정으로 보지 않습니다.
it.each([404, 500, undefined])(
  '취향 미설정이 아닌 조회 오류(%s)는 모달 확인 후 이동한다',
  async (status) => {
    window.sessionStorage.setItem('accessToken', 'test-token')
    vi.spyOn(axios, 'get').mockRejectedValue(
      new AxiosError(
        '조회 실패',
        undefined,
        undefined,
        undefined,
        status ? ({ status } as AxiosResponse) : undefined,
      ),
    )
    const post = vi.spyOn(axios, 'post')
    const put = vi.spyOn(axios, 'put')
    render(<PreferenceSetup />)
    await screen.findByText(
      '취향 설문을 확인하지 못했습니다. 다시 접속해주세요.',
    )
    expect(screen.queryByRole('button', { name: '완료' })).toBeNull()
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull()
    expect(post).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(replace).toHaveBeenCalledWith('/pages/items')
  },
)

it('성공 상태여도 응답에 오류가 있으면 등록 화면을 열지 않는다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: { data: null, error: { message: '조회 오류' } },
  })
  render(<PreferenceSetup />)
  await screen.findByText('취향 설문을 확인하지 못했습니다. 다시 접속해주세요.')
  expect(screen.queryByRole('button', { name: '완료' })).toBeNull()
})
