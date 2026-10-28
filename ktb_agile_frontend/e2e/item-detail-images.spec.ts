import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 700 } })

async function openItem(page: Page, singleImage = false) {
  await page.addInitScript(() =>
    sessionStorage.setItem('accessToken', 'image-test'),
  )
  await page.route('**/*clarity.ms/**', (route) => route.abort())
  await page.route('**/items/999999', (route) => {
    if (route.request().isNavigationRequest()) return route.continue()
    return route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          itemId: 999999,
          title: '사진 넘김 확인',
          content: '사진을 넘겨도 상세 화면의 크기는 유지됩니다.',
          quantity: 1,
          itemState: 'AVAILABLE',
          exchangeUrgencyScore: 1,
          valueGapToleranceScore: 1,
          owner: { userId: 1, nickname: '테스트', profileImageUrl: null },
          groups: [],
          images: singleImage
            ? [{ imageId: 1, imageUrl: '/fox.webp', displayOrder: 1 }]
            : [
                {
                  imageId: 3,
                  imageUrl: '/fox_login_error.png',
                  displayOrder: 3,
                },
                { imageId: 1, imageUrl: '/fox.webp', displayOrder: 1 },
                {
                  imageId: 2,
                  imageUrl: '/kakao_login_large_wide.png',
                  displayOrder: 2,
                },
              ],
          likeCount: 0,
          viewCount: 0,
          exchangeRequestCount: 0,
          isLiked: false,
          createdAt: '2026-10-28T00:00:00',
          updatedAt: '2026-10-28T00:00:00',
        },
        error: null,
      },
    })
  })
  await page.goto('/pages/items/999999')
  await expect(
    page.getByRole('img', { name: '사진 넘김 확인' }),
  ).toHaveAttribute('src', '/fox.webp')
}

async function drag(page: Page, distance: number, release = true) {
  const box = (await page
    .getByRole('region', { name: '물품 사진' })
    .boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height * 0.7
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + distance, y, { steps: 8 })
  if (release) await page.mouse.up()
}

async function translation(page: Page) {
  return page
    .getByRole('region', { name: '물품 사진' })
    .locator('div')
    .first()
    .evaluate((track) => new DOMMatrix(getComputedStyle(track).transform).m41)
}

test('사진을 순서대로 넘기고 양 끝에서는 검은 여백을 당긴 뒤 복귀한다', async ({
  page,
}) => {
  await openItem(page)
  const image = page.getByRole('img', { name: '사진 넘김 확인' })
  const area = page.getByRole('region', { name: '물품 사진' })
  const initialBox = await area.boundingBox()

  await drag(page, 140, false)
  expect(await translation(page)).toBeGreaterThan(0)
  expect(await translation(page)).toBeLessThan(140)
  await page.mouse.up()
  await expect.poll(() => translation(page)).toBeCloseTo(0, 0)
  await expect(image).toHaveAttribute('src', '/fox.webp')

  await drag(page, -140)
  await expect(image).toHaveAttribute('src', '/kakao_login_large_wide.png')
  await drag(page, -140)
  await expect(image).toHaveAttribute('src', '/fox_login_error.png')
  const lastPosition = -initialBox!.width * 2
  await expect.poll(() => translation(page)).toBeCloseTo(lastPosition, 0)

  await drag(page, -140, false)
  expect(await translation(page)).toBeLessThan(lastPosition)
  await page.mouse.up()
  await expect.poll(() => translation(page)).toBeCloseTo(lastPosition, 0)
  await expect(image).toHaveAttribute('src', '/fox_login_error.png')

  await drag(page, 140)
  await expect(image).toHaveAttribute('src', '/kakao_login_large_wide.png')
  await drag(page, 20)
  await expect(image).toHaveAttribute('src', '/kakao_login_large_wide.png')
  await drag(page, 140)
  await expect(image).toHaveAttribute('src', '/fox.webp')
  expect(await area.boundingBox()).toEqual(initialBox)
})

test('한 장만 등록된 경우 양쪽으로 당겨도 같은 사진을 유지한다', async ({
  page,
}) => {
  await openItem(page, true)
  for (const direction of [-140, 140]) {
    await drag(page, direction)
    await expect.poll(() => translation(page)).toBeCloseTo(0, 0)
    await expect(
      page.getByRole('img', { name: '사진 넘김 확인' }),
    ).toHaveAttribute('src', '/fox.webp')
  }
})
