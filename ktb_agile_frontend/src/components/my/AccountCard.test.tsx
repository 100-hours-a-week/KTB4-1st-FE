import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AccountCard from './AccountCard'

const replace = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.setItem('accessToken', 'access-token')
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

it('204 응답을 받으면 Access Token을 삭제하고 메인으로 이동한다', async () => {
  const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 204 })
  render(<AccountCard />)

  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  expect(screen.getByText('정말 로그아웃하시겠습니까?')).toBeDefined()
  expect(post).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '예' }))

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  expect(post).toHaveBeenCalledWith('/bff/auth/logout', undefined, {
    withCredentials: true,
    headers: {
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    },
  })
  expect(window.sessionStorage.getItem('accessToken')).toBeNull()
})

it('취소하면 로그아웃 요청을 보내지 않는다', () => {
  const post = vi.spyOn(axios, 'post')
  render(<AccountCard />)

  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  fireEvent.click(screen.getByRole('button', { name: '취소' }))

  expect(screen.queryByText('정말 로그아웃하시겠습니까?')).toBeNull()
  expect(post).not.toHaveBeenCalled()
  expect(window.sessionStorage.getItem('accessToken')).toBe('access-token')
})

it('로그아웃 요청이 실패하면 토큰을 유지하고 안내 모달을 연다', async () => {
  vi.spyOn(axios, 'post').mockRejectedValue(new Error('server error'))
  render(<AccountCard />)

  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  fireEvent.click(screen.getByRole('button', { name: '예' }))

  expect(
    await screen.findByText(
      '로그아웃에 실패했습니다. 조금 후에 다시 시도해주세요',
    ),
  ).toBeDefined()
  expect(window.sessionStorage.getItem('accessToken')).toBe('access-token')
  expect(replace).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(
    screen.queryByText('로그아웃에 실패했습니다. 조금 후에 다시 시도해주세요'),
  ).toBeNull()
})

it('204가 아닌 성공 응답도 로그아웃 실패로 처리한다', async () => {
  vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 })
  render(<AccountCard />)

  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  fireEvent.click(screen.getByRole('button', { name: '예' }))

  expect(
    await screen.findByText(
      '로그아웃에 실패했습니다. 조금 후에 다시 시도해주세요',
    ),
  ).toBeDefined()
  expect(window.sessionStorage.getItem('accessToken')).toBe('access-token')
  expect(replace).not.toHaveBeenCalled()
})
