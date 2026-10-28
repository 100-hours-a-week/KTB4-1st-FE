import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GROUP_ERRORS } from '@/constants/errors/group'
import GroupListPage from './page'

const { router } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
}))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))
vi.mock('@/components/common/seasonal/HalloweenDecoration', () => ({
  default: () => null,
}))
vi.mock('@/components/groups/modal/GroupJoinModal', () => ({
  default: () => null,
}))

const group = {
  groupId: 12,
  groupName: '우리 동네',
  memberCount: 3,
  roadAddress: '테스트 주소',
  itemCount: 0,
  lastItemCreatedAt: null,
  groupContent: '',
  isJoined: true,
}

beforeEach(() => {
  window.sessionStorage.setItem('accessToken', 'access-token')
  vi.spyOn(axios, 'get').mockResolvedValue({
    data: { data: { groups: [group] } },
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

async function confirmLeave() {
  render(<GroupListPage />)
  fireEvent.click(await screen.findByRole('button', { name: /우리 동네/ }))
  fireEvent.click(screen.getByRole('button', { name: '그룹 탈퇴' }))
  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
  fireEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
}

it('탈퇴 실패 시 서버 메시지와 확인 버튼만 표시하고 확인하면 닫는다', async () => {
  const message = '진행 중인 교환이 있어 탈퇴할 수 없습니다.'
  vi.spyOn(axios, 'delete').mockRejectedValue({
    isAxiosError: true,
    response: { data: { data: null, error: { message } } },
  })
  await confirmLeave()
  expect(await screen.findByText(message)).toBeTruthy()
  expect(screen.queryByRole('button', { name: '탈퇴하기' })).toBeNull()
  expect(screen.queryByRole('button', { name: '취소' })).toBeNull()
  expect(screen.getAllByRole('button', { name: '확인' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
  expect(screen.queryByText(message)).toBeNull()
  expect(screen.getByText(group.groupName)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '그룹 탈퇴' }))
  expect(screen.getByText(/그룹에 게시한 물품은/)).toBeTruthy()
})

it('서버 메시지가 없는 통신 오류에는 기본 실패 문구를 표시한다', async () => {
  vi.spyOn(axios, 'delete').mockRejectedValue(new Error('Network Error'))
  await confirmLeave()
  expect(await screen.findByText(GROUP_ERRORS.LEAVE_FAILED)).toBeTruthy()
  expect(screen.getByRole('button', { name: '확인' })).toBeTruthy()
})

it('탈퇴 성공 시 실패 모달 없이 목록에서 탈퇴한 그룹을 제거한다', async () => {
  vi.spyOn(axios, 'delete').mockResolvedValue({ status: 204 })
  await confirmLeave()
  await waitFor(() => expect(screen.queryByText(group.groupName)).toBeNull())
  expect(screen.queryByRole('button', { name: '확인' })).toBeNull()
})
