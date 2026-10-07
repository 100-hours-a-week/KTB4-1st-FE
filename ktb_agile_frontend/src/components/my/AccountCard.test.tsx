import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import AccountCard from './AccountCard'

afterEach(cleanup)

it('로그아웃 버튼을 누르면 미지원 안내가 열리고 확인하면 닫힌다', () => {
  render(<AccountCard />)

  fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))
  expect(screen.getByText('로그아웃은 현재 지원하지 않는 기능입니다.')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(screen.queryByText('로그아웃은 현재 지원하지 않는 기능입니다.')).toBeNull()
})
