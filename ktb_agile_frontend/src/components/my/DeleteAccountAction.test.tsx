import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import DeleteAccountAction from './DeleteAccountAction'

const replace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.unstubAllGlobals()
  replace.mockReset()
})

it('확인 후 204 응답에서만 토큰을 삭제하고 로그인 화면으로 이동한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  const fetchMock = vi.fn().mockResolvedValue({ status: 204 })
  vi.stubGlobal('fetch', fetchMock)

  render(<DeleteAccountAction />)

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  expect(screen.getByText('정말 탈퇴하시겠습니까?')).toBeDefined()
  expect(fetchMock).not.toHaveBeenCalled()

  fireEvent.click(
    within(
      screen.getByText('정말 탈퇴하시겠습니까?').closest('section')!,
    ).getByRole('button', { name: '탈퇴하기' }),
  )

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth/login'))
  expect(fetchMock).toHaveBeenCalledWith('/bff/users/me', {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer test-token',
      Accept: 'application/json',
    },
  })
  expect(window.sessionStorage.getItem('accessToken')).toBeNull()
})

it('취소하면 요청하지 않는다', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<DeleteAccountAction />)

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  fireEvent.click(screen.getByRole('button', { name: '취소' }))

  expect(screen.queryByText('정말 탈퇴하시겠습니까?')).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('모달이 열리면 전체 앱 화면을 비활성화하고 닫으면 복원한다', async () => {
  const { container } = render(
    <div className="app-shell">
      <DeleteAccountAction />
    </div>,
  )
  const appShell = container.querySelector('.app-shell')!

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))

  await waitFor(() => expect(appShell.hasAttribute('inert')).toBe(true))
  const modal = screen.getByText('정말 탈퇴하시겠습니까?').closest('section')!
  expect(modal.parentElement?.parentElement).toBe(document.body)

  fireEvent.click(within(modal).getByRole('button', { name: '취소' }))
  await waitFor(() => expect(appShell.hasAttribute('inert')).toBe(false))
})

it('실패하면 지정된 오류 모달을 띄우고 토큰을 유지한다', async () => {
  window.sessionStorage.setItem('accessToken', 'test-token')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 }))
  render(<DeleteAccountAction />)

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  fireEvent.click(
    within(
      screen.getByText('정말 탈퇴하시겠습니까?').closest('section')!,
    ).getByRole('button', { name: '탈퇴하기' }),
  )

  expect(
    await screen.findByText('탈퇴에 실패했습니다. 조금 후에 다시 시도해주세요'),
  ).toBeDefined()
  expect(window.sessionStorage.getItem('accessToken')).toBe('test-token')
  expect(replace).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(
    screen.queryByText('탈퇴에 실패했습니다. 조금 후에 다시 시도해주세요'),
  ).toBeNull()
})

it('토큰이 없어도 BFF를 호출하고 401 응답을 실패 모달로 표시한다', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 401 })
  vi.stubGlobal('fetch', fetchMock)
  render(<DeleteAccountAction />)

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  fireEvent.click(
    within(
      screen.getByText('정말 탈퇴하시겠습니까?').closest('section')!,
    ).getByRole('button', { name: '탈퇴하기' }),
  )

  expect(
    await screen.findByText('탈퇴에 실패했습니다. 조금 후에 다시 시도해주세요'),
  ).toBeDefined()
  expect(fetchMock).toHaveBeenCalledWith('/bff/users/me', {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })
  expect(replace).not.toHaveBeenCalled()
})
