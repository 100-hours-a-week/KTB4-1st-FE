import { expect, test } from '@playwright/test'

test('랜딩페이지에서 카카오 인증을 바로 시작한다', async ({ page }) => {
  await page.route('**/auth/oauth/state', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:3000',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { data: { state: 'landing-login-state' } },
    }),
  )
  await page.route('https://kauth.kakao.com/oauth/authorize?**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Kakao authorization</p>',
    }),
  )

  await page.goto('/auth/login')
  await expect(page).toHaveURL('/auth/login')
  await expect(page.getByRole('heading', { name: '바꾸까' })).toBeVisible()
  await page.getByRole('button', { name: '카카오 로그인' }).click()

  await expect(page).toHaveURL(
    /https:\/\/kauth\.kakao\.com\/oauth\/authorize\?/,
  )
  const authorizeUrl = new URL(page.url())
  expect(authorizeUrl.searchParams.get('state')).toBe('landing-login-state')
  expect(authorizeUrl.searchParams.get('response_type')).toBe('code')
})

test('로그인 주소에서 랜딩페이지를 바로 표시한다', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page).toHaveURL('/auth/login')
  await expect(page.getByRole('heading', { name: '바꾸까' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: '카카오 로그인' }),
  ).toBeVisible()
})

test('인증 요청이 실패하면 랜딩페이지에서 재시도할 수 있다', async ({
  page,
}) => {
  await page.route('**/auth/oauth/state', (route) => route.abort())
  await page.goto('/auth/login')
  const loginButton = page.getByRole('button', { name: '카카오 로그인' })
  await loginButton.click()
  await expect(
    page.getByText('서버에 연결할 수 없습니다.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: '확인', exact: true }).click()
  await expect(loginButton).toBeEnabled()
  await expect(page).toHaveURL('/auth/login')
})


test('루트 주소로 접속하면 로그인 랜딩페이지로 이동한다', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/auth/login')
  await expect(page.getByRole('heading', { name: '바꾸까' })).toBeVisible()
})
