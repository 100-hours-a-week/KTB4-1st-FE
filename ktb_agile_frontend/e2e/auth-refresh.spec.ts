import { expect, test, type Page } from '@playwright/test'

const expiredToken = 'expired-access-token'
const newToken = 'new-access-token'

// 실제 Spring 대신 응답을 제어해 토큰 만료 상황을 재현합니다.
async function prepareLogin(page: Page, refreshToken: string) {
  const requests = { refresh: 0, expired: 0, retried: 0, items: 0 }

  await page.addInitScript((token) => {
    if (window.location.pathname === '/pages/items') {
      window.sessionStorage.setItem('accessToken', token)
    }
  }, expiredToken)

  await page.context().addCookies([{
    name: 'refresh_token',
    value: refreshToken,
    domain: '127.0.0.1',
    path: '/bff/auth',
    httpOnly: true,
    sameSite: 'Lax',
  }])

  // 외부 분석 도구 요청은 테스트와 분리합니다.
  await page.route('**/*clarity.ms/**', (route) => route.abort())

  await page.route('**/users/me/groups?**', async (route) => {
    const headers = { 'Access-Control-Allow-Origin': '*' }
    if (route.request().headers().authorization === `Bearer ${expiredToken}`) {
      requests.expired += 1
      await route.fulfill({
        status: 401,
        headers,
        json: { data: null, error: { code: 'AUTHENTICATION_REQUIRED' } },
      })
      return
    }

    expect(route.request().headers().authorization).toBe(`Bearer ${newToken}`)
    requests.retried += 1
    await route.fulfill({
      headers,
      json: { data: { groups: [{ groupId: 1, groupName: '테스트 그룹' }] } },
    })
  })

  await page.route('**/bff/auth/accesstoken', async (route) => {
    requests.refresh += 1
    expect(route.request().method()).toBe('POST')
    const headers = await route.request().allHeaders()
    expect(headers.cookie).toContain(`refresh_token=${refreshToken}`)

    if (refreshToken === 'valid-refresh-token') {
      await route.fulfill({ json: {
        data: { accessToken: newToken, tokenType: 'Bearer', expiresIn: 900 },
        error: null,
      } })
    } else {
      await route.fulfill({ status: 401, json: {
        data: null,
        error: { code: 'AUTH_REFRESH_TOKEN_INVALID', message: 'Refresh Token이 유효하지 않습니다.' },
      } })
    }
  })

  await page.route('**/groups/1/items?**', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${newToken}`)
    requests.items += 1
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { data: { items: [{
        itemId: 10,
        title: '테스트 물품',
        contentPreview: '재발급 후 조회된 물품입니다.',
        quantity: 1,
        owner: { userId: 1, nickname: '테스트 사용자' },
        itemState: 'AVAILABLE',
        thumbnailImageUrl: null,
        likeCount: 0,
        exchangeRequestCount: 0,
        isLiked: false,
        createdAt: '2026-10-01T00:00:00Z',
      }], nextCursor: null, hasNext: false }, error: null },
    })
  })

  return requests
}

test('refresh token이 유효하면 토큰을 교체하고 요청을 재시도해 물품 목록을 표시한다', async ({ page }) => {
  const requests = await prepareLogin(page, 'valid-refresh-token')

  await page.goto('/pages/items')
  await expect(page.getByRole('heading', { name: '테스트 물품' })).toBeVisible()

  expect(requests.expired).toBeGreaterThanOrEqual(1)
  expect(requests.refresh).toBe(1)
  expect(requests.retried).toBe(1)
  expect(requests.items).toBe(1)
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBe(newToken)
  await expect(page.getByText('로그인이 만료되었습니다. 다시 로그인해주세요.')).toHaveCount(0)
  await expect(page).toHaveURL('/pages/items')
})

test('refresh token이 무효하면 토큰을 지우고 모달 확인 후 로그인 화면으로 이동한다', async ({ page }) => {
  const requests = await prepareLogin(page, 'invalid-refresh-token')

  await page.goto('/pages/items')
  await expect(page.getByText('로그인이 만료되었습니다. 다시 로그인해주세요.')).toBeVisible()

  expect(requests.expired).toBeGreaterThanOrEqual(1)
  expect(requests.refresh).toBe(1)
  expect(requests.retried).toBe(0)
  expect(requests.items).toBe(0)
  expect(await page.evaluate(() => sessionStorage.getItem('accessToken'))).toBeNull()
  // 모달을 확인하기 전에는 로그인 화면으로 이동하지 않습니다.
  await expect(page).toHaveURL('/pages/items')

  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL('/auth/login')
  await expect(page.getByRole('button', { name: '카카오 로그인' })).toBeVisible()
})
