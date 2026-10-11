// @vitest-environment node

import { afterEach, expect, it, vi } from 'vitest'
import { GET } from './route'

afterEach(() => vi.unstubAllGlobals())

it('인증 헤더와 커서를 백엔드로 전달하고 응답을 반환한다', async () => {
  const backendResponse = {
    data: { items: [], nextCursor: null, hasNext: false },
    error: null,
  }
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json(backendResponse, { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(
    new Request('http://localhost/bff/my-items?cursor=next-page', {
      headers: { Authorization: 'Bearer access-token' },
    }),
  )

  const [url, options] = fetchMock.mock.calls[0]
  expect(new URL(url).pathname).toBe('/users/me/items')
  expect(new URL(url).searchParams.get('size')).toBe('10')
  expect(new URL(url).searchParams.get('cursor')).toBe('next-page')
  expect(options.headers).toEqual({
    Authorization: 'Bearer access-token',
    Accept: 'application/json',
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(backendResponse)
})

it('인증 헤더가 없으면 백엔드를 호출하지 않는다', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)

  const response = await GET(new Request('http://localhost/bff/my-items'))

  expect(response.status).toBe(401)
  expect(fetchMock).not.toHaveBeenCalled()
})

it('백엔드 오류 상태와 메시지를 그대로 전달한다', async () => {
  const backendError = {
    data: null,
    error: {
      code: 'BAD_REQUEST',
      message: 'cursor 값이 올바르지 않습니다.',
      details: [],
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json(backendError, { status: 400 })),
  )

  const response = await GET(
    new Request('http://localhost/bff/my-items?cursor=invalid', {
      headers: { Authorization: 'Bearer access-token' },
    }),
  )

  expect(response.status).toBe(400)
  expect(await response.json()).toEqual(backendError)
})
