import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ChatbotButton from './ChatbotButton'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.sessionStorage.clear()
})

function openChat() {
  render(<ChatbotButton />)
  fireEvent.click(screen.getByRole('button', { name: '챗봇 열기' }))
  return screen.getByRole('textbox', { name: '메시지 입력' }) as HTMLInputElement
}

it('500자 이하 입력은 그대로 두고 안내하지 않는다', () => {
  const input = openChat()

  fireEvent.change(input, { target: { value: 'a'.repeat(500) } })

  expect(input.value).toHaveLength(500)
  expect(screen.queryByRole('status')).toBeNull()
})

it('500자를 넘기면 500자로 자르고 토스트로 안내한 뒤 사라진다', () => {
  vi.useFakeTimers()
  const input = openChat()

  fireEvent.change(input, { target: { value: 'a'.repeat(600) } })

  expect(input.value).toHaveLength(500)
  expect(screen.getByRole('status').textContent).toBe(
    '메시지는 500자까지만 입력할 수 있어요.',
  )

  act(() => vi.advanceTimersByTime(2000))
  expect(screen.queryByRole('status')).toBeNull()
})
