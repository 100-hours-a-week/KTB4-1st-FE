import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { API_BASE_URL } from '@/config/api'
import { apiClient } from '@/config/apiClient'

const originalClientAdapter = apiClient.defaults.adapter
const originalAxiosAdapter = axios.defaults.adapter
let requests: InternalAxiosRequestConfig[] = []

function ok(config: InternalAxiosRequestConfig, data: unknown = {}) {
  return {
    config,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    data,
  }
}

function useAdapter(adapter: AxiosAdapter) {
  const recording: AxiosAdapter = async (config) => {
    requests.push(config)
    return adapter(config)
  }
  apiClient.defaults.adapter = recording
  axios.defaults.adapter = recording
}

function sentAuthorization(url: string) {
  return requests
    .find((request) => request.url === url)
    ?.headers.get('Authorization')
}

beforeEach(() => {
  requests = []
  window.sessionStorage.setItem('accessToken', 'access-token')
  useAdapter(async (config) => ok(config))
})

afterEach(() => {
  apiClient.defaults.adapter = originalClientAdapter
  axios.defaults.adapter = originalAxiosAdapter
  window.sessionStorage.clear()
})

it.each(['/bff/users/me', `${API_BASE_URL}/items/1`])(
  '우리 서버로 보내는 요청(%s)에는 저장된 토큰을 붙인다',
  async (url) => {
    await apiClient.get(url)

    expect(sentAuthorization(url)).toBe('Bearer access-token')
  },
)

it('외부 주소로 보내는 요청에는 토큰을 붙이지 않는다', async () => {
  await apiClient.put('https://s3.example/upload', 'file')

  expect(sentAuthorization('https://s3.example/upload')).toBeFalsy()
})

it('전역 axios 요청에는 토큰을 붙이지 않는다', async () => {
  await axios.get('/bff/users/me')

  expect(sentAuthorization('/bff/users/me')).toBeFalsy()
})

it('토큰 재발급 요청에는 토큰을 붙이지 않는다', async () => {
  await apiClient.post('/bff/auth/accesstoken')

  expect(sentAuthorization('/bff/auth/accesstoken')).toBeFalsy()
})

it('저장된 토큰이 없으면 헤더 없이 보낸다', async () => {
  window.sessionStorage.removeItem('accessToken')

  await apiClient.get('/bff/users/me')

  expect(sentAuthorization('/bff/users/me')).toBeFalsy()
})

it('401 응답이면 토큰을 재발급해 새 토큰으로 한 번 다시 보낸다', async () => {
  let refreshCount = 0
  useAdapter(async (config) => {
    if (config.url === '/bff/auth/accesstoken') {
      refreshCount += 1
      return ok(config, { data: { accessToken: 'new-token' } })
    }
    if (config.headers.get('Authorization') !== 'Bearer new-token') {
      throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
        ...ok(config),
        status: 401,
      })
    }
    return ok(config, { data: { nickname: '민지' } })
  })

  const response = await apiClient.get('/bff/users/me')

  expect(response.data).toEqual({ data: { nickname: '민지' } })
  expect(refreshCount).toBe(1)
  expect(window.sessionStorage.getItem('accessToken')).toBe('new-token')
})
