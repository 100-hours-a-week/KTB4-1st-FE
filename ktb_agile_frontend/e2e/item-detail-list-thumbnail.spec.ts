import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 700 } })

const itemId = 999998
const listThumbnail = '/fox.webp'
const detailThumbnail = '/crane.webp'

test('목록에서 클릭하면 상세 응답 전에 목록 썸네일을 먼저 보여 준다', async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('accessToken', 'list-thumbnail-test'),
  )
  await page.route('**/*clarity.ms/**', (route) => route.abort())
  await page.route('**/bff/me/groups', (route) =>
    route.fulfill({
      json: {
        data: { groups: [{ groupId: 1, groupName: '썸네일 테스트 그룹' }] },
        error: null,
      },
    }),
  )
  await page.route('**/groups/1/items?**', (route) =>
    route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          items: [
            {
              itemId,
              title: '목록 썸네일 확인',
              contentPreview: '상세 사진보다 목록 썸네일이 먼저 보입니다.',
              quantity: 1,
              owner: { userId: 1, nickname: '테스트' },
              itemState: 'AVAILABLE',
              thumbnailImageUrl: listThumbnail,
              likeCount: 0,
              viewCount: 0,
              exchangeRequestCount: 0,
              isLiked: false,
              createdAt: '2026-11-10T00:00:00Z',
            },
          ],
          nextCursor: null,
          hasNext: false,
        },
        error: null,
      },
    }),
  )

  // 상세 응답을 붙잡아 두고, 응답 전 화면을 확인한 뒤에 보낸다.
  let releaseDetail = () => {}
  const detailReleased = new Promise<void>((resolve) => {
    releaseDetail = resolve
  })
  await page.route(`**/items/${itemId}`, async (route) => {
    if (route.request().isNavigationRequest()) return route.continue()
    await detailReleased
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          itemId,
          title: '목록 썸네일 확인',
          content: '상세 사진이 뜨면 목록 썸네일은 사라집니다.',
          quantity: 1,
          itemState: 'AVAILABLE',
          exchangeUrgencyScore: 1,
          valueGapToleranceScore: 1,
          owner: { userId: 1, nickname: '테스트', profileImageUrl: null },
          groups: [],
          thumbnailImageId: 1,
          images: [
            {
              imageId: 1,
              imageUrl: '/fox_login_error.png',
              detailThumbnailUrl: detailThumbnail,
              displayOrder: 1,
            },
          ],
          likeCount: 0,
          viewCount: 0,
          exchangeRequestCount: 0,
          isLiked: false,
          createdAt: '2026-11-10T00:00:00',
          updatedAt: '2026-11-10T00:00:00',
        },
        error: null,
      },
    })
  })

  await page.goto('/pages/items?groupId=1')
  await page.locator(`a[href="/pages/items/${itemId}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`/pages/items/${itemId}$`))

  const placeholder = page.locator(
    `img[aria-hidden="true"][src="${listThumbnail}"]`,
  )
  await expect(placeholder).toBeVisible()
  // 상세 응답 전이므로 상세 사진은 아직 없고 로딩 문구가 보인다.
  await expect(page.getByText('물품 정보를 불러오는 중입니다.')).toBeVisible()
  await expect(page.getByRole('img', { name: '목록 썸네일 확인' })).toHaveCount(
    0,
  )
  expect(
    await placeholder.evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
    ),
  ).toBe(true)

  releaseDetail()
  await expect(
    page.getByRole('img', { name: '목록 썸네일 확인' }),
  ).toHaveAttribute('src', detailThumbnail)
  await expect(placeholder).toHaveCount(0)
})
