import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AuthGuard from './AuthGuard'

const replace = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

it('액세스 토큰이 있으면 페이지를 보여준다', () => {
  window.sessionStorage.setItem('accessToken', 'access-token')

  render(
    <AuthGuard>
      <p>보호된 페이지</p>
    </AuthGuard>,
  )

  expect(screen.getByText('보호된 페이지')).toBeDefined()
  expect(replace).not.toHaveBeenCalled()
})

it('액세스 토큰이 없으면 페이지를 그리지 않고 로그인 화면으로 이동한다', () => {
  render(
    <AuthGuard>
      <p>보호된 페이지</p>
    </AuthGuard>,
  )

  expect(screen.queryByText('보호된 페이지')).toBeNull()
  expect(replace).toHaveBeenCalledWith('/')
})
