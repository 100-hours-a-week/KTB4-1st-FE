import { afterEach, describe, expect, it } from 'vitest'
import {
  clearAccessToken,
  getAccessToken,
  getCurrentUserId,
  setAccessToken,
} from './tokenStore'

// payload가 { "sub": "42" }인 테스트용 JWT
const TOKEN_WITH_USER_42 = `header.${btoa(JSON.stringify({ sub: '42' }))
  .replace(/=+$/, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')}.signature`

afterEach(() => {
  window.sessionStorage.clear()
})

describe('tokenStore', () => {
  it('저장한 토큰을 그대로 돌려준다', () => {
    setAccessToken('token-a')
    expect(getAccessToken()).toBe('token-a')
  })

  it('토큰이 없으면 null을 돌려준다', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('기존 코드와 같은 sessionStorage 키를 사용한다', () => {
    window.sessionStorage.setItem('accessToken', 'legacy-token')
    expect(getAccessToken()).toBe('legacy-token')
  })

  it('토큰을 지우면 더 이상 조회되지 않는다', () => {
    setAccessToken('token-a')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })

  it('저장된 토큰에서 사용자 ID를 읽는다', () => {
    setAccessToken(TOKEN_WITH_USER_42)
    expect(getCurrentUserId()).toBe(42)
  })

  it('토큰이 없거나 읽을 수 없으면 사용자 ID는 null이다', () => {
    expect(getCurrentUserId()).toBeNull()
    setAccessToken('not-a-jwt')
    expect(getCurrentUserId()).toBeNull()
  })
})
