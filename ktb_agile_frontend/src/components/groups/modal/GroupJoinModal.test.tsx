import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/config/api'
import { GROUP_ERRORS } from '@/constants/errors/group'
import type { GroupCardData } from '@/types/group'
import GroupJoinModal from './GroupJoinModal'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))

const group: GroupCardData = {
  groupId: 12,
  groupName: '우리 동네',
  memberCount: 3,
  roadAddress: '테스트 주소',
  itemCount: 0,
  lastItemCreatedAt: null,
  groupContent: '',
  isJoined: false,
}
const coords = { latitude: 37.5, longitude: 127.1, accuracy: 25 }
const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>()
const onJoined = vi.fn()
const onCancel = vi.fn()
const verifiedResponse = {
  status: 200,
  data: { data: { verified: true, failureReason: null }, error: null },
}

function openModal() {
  render(
    <GroupJoinModal group={group} onJoined={onJoined} onCancel={onCancel} />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getCurrentPosition.mockReset()
  window.sessionStorage.setItem('accessToken', 'access-token')
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(axios, 'post').mockResolvedValue(verifiedResponse)
})

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('확인 전에는 위치를 요청하지 않고 취소하면 API를 호출하지 않는다', () => {
  openModal()
  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  expect(getCurrentPosition).not.toHaveBeenCalled()
  expect(axios.post).not.toHaveBeenCalled()
  expect(onCancel).toHaveBeenCalledOnce()
})

it('위치를 기다린 후 인증을 요청하고, verified가 true일 때만 참여한다', async () => {
  let verify: ((value: typeof verifiedResponse) => void) | undefined
  vi.mocked(axios.post)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          verify = resolve
        }),
    )
    .mockResolvedValueOnce({ status: 201, data: '' })
  openModal()
  fireEvent.click(screen.getByRole('button', { name: '예' }))
  expect(axios.post).not.toHaveBeenCalled()
  expect(
    (screen.getByRole('button', { name: '예' }) as HTMLButtonElement).disabled,
  ).toBe(true)

  getCurrentPosition.mock.calls[0][0]({ coords } as GeolocationPosition)
  await waitFor(() => expect(axios.post).toHaveBeenCalledOnce())
  const config = {
    headers: {
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    },
  }
  expect(axios.post).toHaveBeenNthCalledWith(
    1,
    `${API_BASE_URL}/groups/12/location-verifications`,
    coords,
    config,
  )
  expect(onJoined).not.toHaveBeenCalled()

  verify?.(verifiedResponse)
  await waitFor(() =>
    expect(onJoined).toHaveBeenCalledWith({
      ...group,
      isJoined: true,
      memberCount: 4,
    }),
  )
  expect(axios.post).toHaveBeenNthCalledWith(
    2,
    `${API_BASE_URL}/groups/12/members`,
    undefined,
    config,
  )
  expect(console.log).toHaveBeenCalledWith('현재 위치', coords)
})

it.each([
  [1, GROUP_ERRORS.LOCATION_DENIED],
  [2, GROUP_ERRORS.LOCATION_UNAVAILABLE],
  [3, GROUP_ERRORS.LOCATION_TIMEOUT],
])(
  '위치 조회 실패 코드 %s이면 안내하고 참여를 중단한다',
  async (code, message) => {
    getCurrentPosition.mockImplementationOnce((_success, failure) => {
      failure?.({ code } as GeolocationPositionError)
    })
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    expect(
      await screen.findByText((text) => text.startsWith(message)),
    ).toBeDefined()
    expect(axios.post).not.toHaveBeenCalled()
    expect(onJoined).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByText((text) => text.startsWith(message))).toBeNull()
    expect(onCancel).toHaveBeenCalledOnce()
  },
)

it.each(['인증', '참여'])(
  '%s API의 백엔드 오류 메시지를 모달에 표시한다',
  async (stage) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords } as GeolocationPosition)
    })
    if (stage === '참여')
      vi.mocked(axios.post).mockResolvedValueOnce(verifiedResponse)
    vi.mocked(axios.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: { error: { message: '그룹 위치 인증이 필요합니다.' } },
      },
    })
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    expect(
      await screen.findByText('그룹 위치 인증이 필요합니다.'),
    ).toBeDefined()
    expect(axios.post).toHaveBeenCalledTimes(stage === '인증' ? 1 : 2)
    expect(onJoined).not.toHaveBeenCalled()
  },
)

it('위치 기능을 지원하지 않으면 API를 호출하지 않는다', async () => {
  vi.stubGlobal('navigator', {})
  openModal()
  fireEvent.click(screen.getByRole('button', { name: '예' }))
  expect(
    await screen.findByText(GROUP_ERRORS.LOCATION_UNSUPPORTED),
  ).toBeDefined()
  expect(axios.post).not.toHaveBeenCalled()
})

it.each([1, 2, 3])(
  '위치 오류 %s 이후 다시 시도하면 같은 그룹의 위치를 새로 요청한다',
  async (code) => {
    getCurrentPosition.mockImplementationOnce((_success, failure) => {
      failure?.({ code } as GeolocationPositionError)
    })
    getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords } as GeolocationPosition)
    })
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    const retryButton = await screen.findByRole('button', { name: '다시 시도' })
    expect(onCancel).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
    if (code === 1) {
      expect(
        screen.getByText((text) =>
          text.includes('사이트 설정에서 위치 권한을 허용'),
        ),
      ).toBeDefined()
    }
    fireEvent.click(retryButton)
    await waitFor(() => expect(onJoined).toHaveBeenCalledOnce())
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    expect(axios.post).toHaveBeenCalledTimes(2)
    expect(onCancel).not.toHaveBeenCalled()
  },
)

it('재시도에서도 거부하면 안내를 유지하고 API를 호출하지 않는다', async () => {
  getCurrentPosition.mockImplementation((_success, failure) => {
    failure?.({ code: 1 } as GeolocationPositionError)
  })
  openModal()
  fireEvent.click(screen.getByRole('button', { name: '예' }))
  fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }))
  expect(await screen.findByRole('button', { name: '다시 시도' })).toBeDefined()
  expect(getCurrentPosition).toHaveBeenCalledTimes(2)
  expect(axios.post).not.toHaveBeenCalled()
  expect(onJoined).not.toHaveBeenCalled()
})

it.each([
  ['ACCURACY_TOO_LOW', '정확도가 낮습니다. 다시 측정해주세요.'],
  [
    'DISTANCE_TOO_FAR',
    '현재 참여하려는 그룹의 반경 위치에서 많이 떨어져 있습니다. 반경 500m이내에서 다시 시도하세요',
  ],
])(
  '200 응답의 실패 사유 %s를 표시하고 재측정 전에는 참여하지 않는다',
  async (failureReason, message) => {
    getCurrentPosition.mockImplementation((success) => {
      success({ coords } as GeolocationPosition)
    })
    vi.mocked(axios.post).mockResolvedValueOnce({
      status: 200,
      data: { data: { verified: false, failureReason }, error: null },
    })
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    expect(await screen.findByText(message)).toBeDefined()
    expect(axios.post).toHaveBeenCalledOnce()
    expect(onJoined).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(onJoined).toHaveBeenCalledOnce())
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    expect(axios.post).toHaveBeenCalledTimes(3)
  },
)

it.each([
  {
    status: 200,
    data: { data: { verified: false, failureReason: 'UNKNOWN' }, error: null },
  },
  {
    status: 200,
    data: { data: { verified: false, failureReason: null }, error: null },
  },
  { status: 200, data: { data: null, error: null } },
  {
    status: 200,
    data: { data: { verified: 'true', failureReason: null }, error: null },
  },
  { status: 204, data: '' },
])(
  '알 수 없는 실패나 잘못된 인증 응답에서는 참여를 중단한다 (%j)',
  async (response) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords } as GeolocationPosition)
    })
    vi.mocked(axios.post).mockResolvedValueOnce(response)
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    expect(await screen.findByText(GROUP_ERRORS.JOIN_FAILED)).toBeDefined()
    expect(axios.post).toHaveBeenCalledOnce()
    expect(onJoined).not.toHaveBeenCalled()
  },
)

it.each([400, 401, 404, 500])(
  'HTTP %s 응답의 서버 메시지를 표시하고 참여하지 않는다',
  async (status) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success({ coords } as GeolocationPosition)
    })
    vi.mocked(axios.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status,
        data: { data: null, error: { message: '서버에서 전달한 오류입니다.' } },
      },
    })
    openModal()
    fireEvent.click(screen.getByRole('button', { name: '예' }))
    expect(await screen.findByText('서버에서 전달한 오류입니다.')).toBeDefined()
    expect(axios.post).toHaveBeenCalledOnce()
    expect(onJoined).not.toHaveBeenCalled()
  },
)
