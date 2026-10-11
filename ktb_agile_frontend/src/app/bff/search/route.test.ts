// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

it('선택 그룹, 검색어, 커서를 백엔드 검색 API로 전달한다', async () => {
  const body = {
    data: { items: [], nextCursor: null, hasNext: false },
    error: null,
  }
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body))
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(
    new Request(
      'http://localhost/bff/search?groupId=12&keyword=%20%EC%B6%A9%EC%A0%84%EA%B8%B0%20&cursor=next',
      {
        headers: { Authorization: 'Bearer access-token' },
      },
    ),
  )

  const [url, options] = fetchMock.mock.calls[0]
  expect(new URL(url).pathname).toBe('/items')
  expect(new URL(url).searchParams.get('groupId')).toBe('12')
  expect(new URL(url).searchParams.get('keyword')).toBe('충전기')
  expect(new URL(url).searchParams.get('cursor')).toBe('next')
  expect(options.headers.Authorization).toBe('Bearer access-token')
  expect(options.cache).toBe('no-store')
  expect(await response.json()).toEqual(body)
})

it('인증 또는 그룹 ID가 없으면 백엔드를 호출하지 않는다', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  expect(
    (await GET(new Request('http://localhost/bff/search?groupId=12'))).status,
  ).toBe(401)
  expect(
    (
      await GET(
        new Request('http://localhost/bff/search?keyword=충전기', {
          headers: { Authorization: 'Bearer access-token' },
        }),
      )
    ).status,
  ).toBe(400)
  expect(fetchMock).not.toHaveBeenCalled()
})

it('백엔드 오류 상태와 본문을 그대로 반환한다', async () => {
  const body = {
    data: null,
    error: {
      code: 'FORBIDDEN',
      message: '그룹 접근 권한이 없습니다.',
      details: [],
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json(body, { status: 403 })),
  )

  const response = await GET(
    new Request('http://localhost/bff/search?groupId=12&keyword=충전기', {
      headers: { Authorization: 'Bearer access-token' },
    }),
  )

  expect(response.status).toBe(403)
  expect(await response.json()).toEqual(body)
})
