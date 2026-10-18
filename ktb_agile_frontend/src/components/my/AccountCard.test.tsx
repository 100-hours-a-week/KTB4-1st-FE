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
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { nickname: '테스트', profileImageUrl: null },
        error: null,
      }),
    }),
  )
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('BFF에서 조회한 닉네임과 프로필 이미지를 표시한다', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        nickname: '민지',
        profileImageUrl: 'https://example.com/profile.jpg',
      },
      error: null,
    }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const { container } = render(<AccountCard />)

  expect(await screen.findByText('안녕하세요 민지님!')).toBeDefined()
  expect(fetchMock).toHaveBeenCalledWith('/bff/users/me', {
    headers: {
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  expect(container.querySelector('[style]')?.getAttribute('style')).toContain(
    'profile.jpg',
  )
  expect(screen.queryByText(/사진이 안 보일 수 있어요/)).toBeNull()
})

it.each([null, undefined, ''])(
  '프로필 이미지가 %s이면 안내 말풍선을 보여준다',
  async (profileImageUrl) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { nickname: '민지', profileImageUrl },
          error: null,
        }),
      }),
    )
    render(<AccountCard />)

    expect(
      await screen.findByText(
        "로그인 시 '선택'을 누르지 않으면 사진이 안 보일 수 있어요.",
      ),
    ).toBeDefined()
  },
)

it('말풍선 밖을 터치하면 말풍선을 서서히 숨긴다', async () => {
  render(<AccountCard />)
  const notice = await screen.findByText(/사진이 안 보일 수 있어요/)

  fireEvent.pointerDown(notice)
  expect(notice.className).not.toContain('imageNoticeHidden')

  fireEvent.pointerDown(document.body)
  expect(notice.className).toContain('imageNoticeHidden')
})

it('프로필 조회가 실패하면 모달을 보여주고 확인 시 로그인으로 이동한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<AccountCard />)

  expect(
    await screen.findByText(
      '프로필 정보를 가져오는데 실패했습니다. 다시 로그인해주세요.',
    ),
  ).toBeDefined()
  expect(replace).not.toHaveBeenCalled()
  expect(screen.queryByText(/사진이 안 보일 수 있어요/)).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
  expect(window.sessionStorage.getItem('accessToken')).toBeNull()
  expect(replace).toHaveBeenCalledWith('/auth/login')
})

it('액세스 토큰이 없어도 프로필 실패 모달을 보여준다', async () => {
  window.sessionStorage.removeItem('accessToken')
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<AccountCard />)

  expect(
    await screen.findByText(
      '프로필 정보를 가져오는데 실패했습니다. 다시 로그인해주세요.',
    ),
  ).toBeDefined()
  expect(fetchMock).not.toHaveBeenCalled()
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
