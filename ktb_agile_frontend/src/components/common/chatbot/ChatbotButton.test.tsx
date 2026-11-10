import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/config/api'
import ChatbotButton from './ChatbotButton'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
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

it('질문을 보내면 BFF를 거치지 않고 챗봇 API를 바로 호출한다', async () => {
  window.sessionStorage.setItem('accessToken', 'token')
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { data: { answer: '답변', action: null }, error: null },
  })
  const input = openChat()

  fireEvent.change(input, { target: { value: '안녕' } })
  fireEvent.click(screen.getByRole('button', { name: '보내기' }))

  expect(await screen.findByText('답변')).toBeTruthy()
  expect(post).toHaveBeenCalledWith(
    `${API_BASE_URL}/chatbot/ask`,
    { message: '안녕', history: [] },
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token' }),
    }),
  )
})
