import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 700 } })

const itemId = 999997
const title = '상세 썸네일 미리 받기'
const listThumbnail = '/fox.webp'
// 서명 URL처럼 목록과 상세 응답의 쿼리 문자열이 서로 다른 같은 사진이다.
const listDetailThumbnail = '/crane.webp?signature=list'
const apiDetailThumbnail = '/crane.webp?signature=detail'

function gate() {
  let open = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

async function prepare(
  page: Page,
  {
    holdDetailImage = false,
    direct = false,
    detailStatus = 200,
  }: {
    holdDetailImage?: boolean
    direct?: boolean
    detailStatus?: number
  } = {},
) {
  const imageRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/crane.webp')) imageRequests.push(request.url())
  })
  const detailResponse = gate()
  const detailImage = gate()
  if (!holdDetailImage) detailImage.open()

  await page.addInitScript(() =>
    sessionStorage.setItem('accessToken', 'detail-preload-test'),
  )
  await page.route('**/*clarity.ms/**', (route) => route.abort())
  await page.route('**/crane.webp*', async (route) => {
    await detailImage.opened
    await route.continue()
  })
  await page.route('**/bff/me/groups', (route) =>
    route.fulfill({
      json: {
        data: { groups: [{ groupId: 1, groupName: '미리 받기 테스트 그룹' }] },
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
              title,
              contentPreview: '클릭과 동시에 상세 사진을 받습니다.',
              quantity: 1,
              owner: { userId: 1, nickname: '테스트' },
              itemState: 'AVAILABLE',
              thumbnailImageUrl: listThumbnail,
              detailThumbnailImageUrl: listDetailThumbnail,
              likeCount: 0,
              viewCount: 0,
              exchangeRequestCount: 0,
              isLiked: false,
              createdAt: '2026-11-11T00:00:00Z',
            },
          ],
          nextCursor: null,
          hasNext: false,
        },
        error: null,
      },
    }),
  )
  await page.route(`**/items/${itemId}`, async (route) => {
    if (route.request().isNavigationRequest()) return route.continue()
    await detailResponse.opened
    if (detailStatus !== 200) {
      return route.fulfill({
        status: detailStatus,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: { data: null, error: { code: 'ERROR' } },
      })
    }
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          itemId,
          title,
          content: '상세 응답이 와도 첫 사진은 다시 받지 않습니다.',
          quantity: 1,
          itemState: 'AVAILABLE',
          exchangeUrgencyScore: 1,
          valueGapToleranceScore: 1,
          owner: { userId: 2, nickname: '다른 사용자', profileImageUrl: null },
          groups: [],
          thumbnailImageId: 1,
          images: [
            {
              imageId: 1,
              imageUrl: '/fox_login_error.png',
              detailThumbnailUrl: apiDetailThumbnail,
              displayOrder: 1,
            },
          ],
          likeCount: 0,
          viewCount: 0,
          exchangeRequestCount: 0,
          isLiked: false,
          createdAt: '2026-11-11T00:00:00',
          updatedAt: '2026-11-11T00:00:00',
        },
        error: null,
      },
    })
  })

  if (direct) {
    await page.goto(`/pages/items/${itemId}`)
    return { imageRequests, detailResponse, detailImage }
  }

  await page.goto('/pages/items?groupId=1')
  // 목록 썸네일이 실제로 그려진 뒤에 클릭한다.
  await expect(
    page.locator(`img[src="${listThumbnail}"]`).first(),
  ).toBeVisible()
  await page.locator(`a[href="/pages/items/${itemId}"]`).first().click()
  await expect(page).toHaveURL(new RegExp(`/pages/items/${itemId}$`))

  return { imageRequests, detailResponse, detailImage }
}

const isRendered = (image: HTMLImageElement) =>
  image.complete && image.naturalWidth > 0

test('목록에서 클릭하면 상세 썸네일을 바로 요청해 표시하고, 정보가 준비되면 버튼을 활성화한다', async ({
  page,
}) => {
  const { imageRequests, detailResponse } = await prepare(page)

  // 상세 응답 전에 클릭 때 요청한 상세 썸네일이 그려져 있다.
  const preview = page.locator(
    `img[aria-hidden="true"][src="${listDetailThumbnail}"]`,
  )
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate(isRendered)).toBe(true)
  // 정보 영역은 스켈레톤이고, 하단 버튼은 비활성 상태다.
  await expect(
    page.getByRole('status', { name: '물품 정보를 불러오는 중' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '불러오는 중' })).toBeDisabled()

  detailResponse.open()

  // 상세 응답 후에도 첫 사진은 목록에서 받은 주소를 그대로 쓴다.
  await expect(page.getByRole('img', { name: title })).toHaveAttribute(
    'src',
    listDetailThumbnail,
  )
  await expect(page.locator('img[aria-hidden="true"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '제안하기' })).toBeEnabled()
  // 서명 값만 다른 상세 응답의 주소로는 다시 요청하지 않는다.
  expect(imageRequests.some((url) => url.includes('signature=detail'))).toBe(
    false,
  )
  expect(imageRequests.some((url) => url.includes('signature=list'))).toBe(true)
})

test('상세 썸네일을 받는 동안 목록 썸네일을 보여 주고, 정보는 사진을 기다리지 않는다', async ({
  page,
}) => {
  const { imageRequests, detailResponse, detailImage } = await prepare(page, {
    holdDetailImage: true,
  })

  // 상세 썸네일 요청은 이미 시작됐지만 응답 전이다.
  await expect
    .poll(() => imageRequests.some((url) => url.includes('signature=list')))
    .toBe(true)
  // 그동안 목록의 224px 썸네일이 실제로 그려져 있다.
  const listLayer = page.locator(
    `img[aria-hidden="true"][src="${listThumbnail}"]`,
  )
  await expect(listLayer).toBeVisible()
  await expect.poll(() => listLayer.evaluate(isRendered)).toBe(true)

  // 상세 응답이 사진보다 먼저 오면 정보와 버튼은 바로 채워지고, 목록 썸네일은 유지된다.
  detailResponse.open()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('button', { name: '제안하기' })).toBeEnabled()
  await expect(listLayer).toBeVisible()

  // 상세 썸네일이 도착하면 첫 사진으로 그려지고 목록 썸네일이 사라진다.
  detailImage.open()
  const firstPhoto = page.getByRole('img', { name: title })
  await expect(firstPhoto).toHaveAttribute('src', listDetailThumbnail)
  await expect.poll(() => firstPhoto.evaluate(isRendered)).toBe(true)
  await expect(listLayer).toHaveCount(0)
  expect(imageRequests.some((url) => url.includes('signature=detail'))).toBe(
    false,
  )
})

test('주소로 바로 들어오면 미리 받은 사진 없이 스켈레톤을 보여 주고, 응답 후 상세 응답의 사진을 표시한다', async ({
  page,
}) => {
  const { imageRequests, detailResponse } = await prepare(page, {
    direct: true,
  })

  await expect(
    page.getByRole('status', { name: '물품 정보를 불러오는 중' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '불러오는 중' })).toBeDisabled()
  await expect(page.locator('img[aria-hidden="true"]')).toHaveCount(0)
  expect(imageRequests).toEqual([])

  detailResponse.open()

  const firstPhoto = page.getByRole('img', { name: title })
  await expect(firstPhoto).toHaveAttribute('src', apiDetailThumbnail)
  await expect.poll(() => firstPhoto.evaluate(isRendered)).toBe(true)
  await expect(page.getByRole('button', { name: '제안하기' })).toBeEnabled()
  expect(imageRequests.some((url) => url.includes('signature=list'))).toBe(
    false,
  )
})

test('상세 조회에 실패하면 스켈레톤을 지우고 오류를 알린 뒤 목록으로 돌아간다', async ({
  page,
}) => {
  const { detailResponse } = await prepare(page, { detailStatus: 500 })

  await expect(
    page.getByRole('status', { name: '물품 정보를 불러오는 중' }),
  ).toBeVisible()
  detailResponse.open()

  await expect(
    page.getByText('물품 정보를 불러오지 못했습니다', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByRole('status', { name: '물품 정보를 불러오는 중' }),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: '불러오는 중' })).toHaveCount(0)

  await page.getByRole('button', { name: '확인' }).click()
  await expect(page).toHaveURL(/\/pages\/items$/)
})
