// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

it('인증 헤더와 커서를 좋아요 물품 API로 전달한다', async () => {
  const payload = {
    data: { items: [], nextCursor: null, hasNext: false },
    error: null,
  }
  const fetchMock = vi.fn().mockResolvedValue(Response.json(payload))
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(
    new Request('http://localhost/bff/liked-items?cursor=next-page', {
      headers: { Authorization: 'Bearer access-token' },
    }),
  )

  const [url, options] = fetchMock.mock.calls[0]
  expect(new URL(url).pathname).toBe('/users/me/liked-items')
  expect(new URL(url).searchParams.get('size')).toBe('10')
  expect(new URL(url).searchParams.get('cursor')).toBe('next-page')
  expect(options.headers).toEqual({
    Authorization: 'Bearer access-token',
    Accept: 'application/json',
  })
  expect(await response.json()).toEqual(payload)
})

it('인증 헤더가 없으면 401을 반환한다', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(new Request('http://localhost/bff/liked-items'))

  expect(response.status).toBe(401)
  expect(fetchMock).not.toHaveBeenCalled()
})
