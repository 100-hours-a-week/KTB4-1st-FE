// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

it('Bearer 헤더가 없으면 백엔드를 호출하지 않고 401을 반환한다', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(
    new Request('http://localhost/bff/exchanged-items'),
  )

  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({
    data: null,
    error: {
      code: 'UNAUTHORIZED',
      message: '로그인이 필요합니다.',
      details: [],
    },
  })
  expect(fetchMock).not.toHaveBeenCalled()
})

it('인증 헤더와 커서를 교환 완료 목록 API로 전달한다', async () => {
  const backendResponse = {
    data: { items: [], nextCursor: null, hasNext: false },
    error: null,
  }
  const fetchMock = vi.fn().mockResolvedValue(Response.json(backendResponse))
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(
    new Request('http://localhost/bff/exchanged-items?cursor=next-page', {
      headers: { Authorization: 'Bearer access-token' },
    }),
  )

  const [url, options] = fetchMock.mock.calls[0]
  expect(new URL(url).pathname).toBe('/users/me/exchanged-items')
  expect(new URL(url).searchParams.get('size')).toBe('10')
  expect(new URL(url).searchParams.get('cursor')).toBe('next-page')
  expect(options.headers).toEqual({
    Authorization: 'Bearer access-token',
    Accept: 'application/json',
  })
  expect(await response.json()).toEqual(backendResponse)
})
