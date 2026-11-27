import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import axios from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import Navbar from './Navbar'

// apiClient로 보낸 요청도 axios 스파이로 확인합니다.
vi.mock('@/config/apiClient', async () => ({
  apiClient: (await import('axios')).default,
}))

vi.mock('next/navigation', () => ({ usePathname: () => '/pages/items' }))
vi.mock('axios')

function renderNavbar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <Navbar />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('Given 그룹에 속해있지 않은 사용자가 When 로그인했을 때 Then navbar에는 홈, 그룹, MY만 보인다', async () => {
  vi.mocked(axios.get).mockResolvedValue({ data: { data: { groups: [] } } })

  renderNavbar()

  expect(await screen.findByText('홈')).toBeDefined()
  await vi.waitFor(() => expect(axios.get).toHaveBeenCalled())
  const labels = screen.getAllByRole('link').map((link) => link.textContent)
  expect(labels).toEqual(['홈', '그룹', 'MY'])
})

it('그룹에 속한 사용자에게는 등록하기와 채팅 메뉴도 보인다', async () => {
  vi.mocked(axios.get).mockResolvedValue({
    data: { data: { groups: [{ groupId: 1, groupName: '판교' }] } },
  })

  renderNavbar()

  expect(await screen.findByText('등록하기')).toBeDefined()
  expect(screen.getByText('채팅')).toBeDefined()
})
