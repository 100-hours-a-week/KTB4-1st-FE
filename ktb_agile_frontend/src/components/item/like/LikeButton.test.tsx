import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import LikeButton from './LikeButton'

let client: QueryClient
beforeEach(() => {
  client = new QueryClient()
  window.sessionStorage.setItem('accessToken', 'test-token')
})
afterEach(() => {
  cleanup()
  client.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})
const button = (isLiked: boolean, count: number) => (
  <QueryClientProvider client={client}>
    <LikeButton itemId={1} isLiked={isLiked} initialLikeCount={count} />
  </QueryClientProvider>
)

it('서버 props가 바뀌면 좋아요 상태와 개수를 반영한다', () => {
  const { rerender } = render(button(false, 1))
  rerender(button(true, 8))
  expect(
    screen
      .getByRole('button', { name: '좋아요 취소' })
      .getAttribute('aria-pressed'),
  ).toBe('true')
  expect(screen.getByText('8')).toBeDefined()
  rerender(button(false, 3))
  expect(
    screen.getByRole('button', { name: '좋아요' }).getAttribute('aria-pressed'),
  ).toBe('false')
  expect(screen.getByText('3')).toBeDefined()
})

it('좋아요 성공 시 서버 개수를 표시하고 모든 그룹 목록 캐시를 무효화한다', async () => {
  client.setQueryData(['items', 1, 'test-token'], {})
  client.setQueryData(['items', 2, 'test-token'], {})
  vi.spyOn(axios, 'post').mockResolvedValueOnce({
    data: { data: { likeCount: 9 } },
  })
  render(button(false, 1))
  fireEvent.click(screen.getByRole('button', { name: '좋아요' }))
  await screen.findByText('9')
  await waitFor(() =>
    expect(
      client.getQueryState(['items', 1, 'test-token'])?.isInvalidated,
    ).toBe(true),
  )
  expect(client.getQueryState(['items', 2, 'test-token'])?.isInvalidated).toBe(
    true,
  )
})

it('좋아요 취소 성공 시 목록 캐시를 무효화한다', async () => {
  client.setQueryData(['items', 1, 'test-token'], {})
  vi.spyOn(axios, 'delete').mockResolvedValueOnce({ status: 204 })
  render(button(true, 2))
  fireEvent.click(screen.getByRole('button', { name: '좋아요 취소' }))
  await waitFor(() =>
    expect(
      client.getQueryState(['items', 1, 'test-token'])?.isInvalidated,
    ).toBe(true),
  )
  expect(screen.getByText('1')).toBeDefined()
})

it('요청 실패 시 낙관적 변경을 되돌리고 캐시를 무효화하지 않는다', async () => {
  client.setQueryData(['items', 1, 'test-token'], {})
  vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('network'))
  render(button(false, 2))
  fireEvent.click(screen.getByRole('button', { name: '좋아요' }))
  await screen.findByRole('button', { name: '확인' })
  expect(screen.getByText('2')).toBeDefined()
  expect(
    screen.getByRole('button', { name: '좋아요' }).getAttribute('aria-pressed'),
  ).toBe('false')
  expect(client.getQueryState(['items', 1, 'test-token'])?.isInvalidated).toBe(
    false,
  )
})
