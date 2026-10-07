import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import DeleteAccountAction from './DeleteAccountAction'

afterEach(cleanup)

it('탈퇴하기 버튼을 누르면 미지원 안내가 열리고 확인하면 닫힌다', () => {
  render(<DeleteAccountAction />)

  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  expect(screen.getByText('회원 탈퇴는 현재 지원하지 않는 기능입니다.')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(screen.queryByText('회원 탈퇴는 현재 지원하지 않는 기능입니다.')).toBeNull()
})
