import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axios from 'axios'
import { afterEach, expect, it, vi } from 'vitest'
import { GROUP_ERRORS } from '@/constants/errors/group'
import GroupRequiredGuard from './GroupRequiredGuard'

const replace = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('axios')

function renderGuard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <GroupRequiredGuard>
        <p>보호된 페이지</p>
      </GroupRequiredGuard>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('Given 그룹에 속해있지 않은 사용자가 When url로 등록하기·채팅 페이지에 들어오면 Then 모달로 막고 확인 시 그룹 목록으로 이동한다', async () => {
  vi.mocked(axios.get).mockResolvedValue({ data: { data: { groups: [] } } })

  renderGuard()

  expect(await screen.findByText(GROUP_ERRORS.GROUP_REQUIRED)).toBeDefined()
  expect(screen.queryByText('보호된 페이지')).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(replace).toHaveBeenCalledWith('/pages/groups')
})

it('그룹에 속한 사용자에게는 페이지를 보여준다', async () => {
  vi.mocked(axios.get).mockResolvedValue({
    data: { data: { groups: [{ groupId: 1, groupName: '판교' }] } },
  })

  renderGuard()

  expect(await screen.findByText('보호된 페이지')).toBeDefined()
  expect(replace).not.toHaveBeenCalled()
})
