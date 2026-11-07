import { expect, test, type Page } from '@playwright/test'

const SEARCH_PATH = '/pages/search'
const SMART_SEARCH_PATH = '/pages/search/ai-smart-search'
const RESULT_PATH = '/pages/search/ai-smart-search/result'

function json(data: unknown) {
  return {
    headers: { 'Access-Control-Allow-Origin': '*' },
    json: { data, error: null },
  }
}

async function mockSmartSearch(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem('accessToken', 'smart-search-test'),
  )
  await page.route('**/*clarity.ms/**', (route) => route.abort())
  await page.route('**/bff/search-histories', (route) =>
    route.fulfill(json({ searchHistories: [] })),
  )
  await page.route('**/bff/me/groups**', (route) =>
    route.fulfill(
      json({
        groups: [{ groupId: 1, groupName: '우리 동네' }],
        nextCursor: null,
        hasNext: false,
      }),
    ),
  )
  await page.route('**/bff/my-items**', (route) =>
    route.fulfill(
      json({
        items: [
          {
            itemId: 101,
            groups: [{ groupId: 1, groupName: '우리 동네' }],
            title: '아이폰 충전기',
            contentPreview: '사용하지 않는 물품입니다.',
            quantity: 1,
            itemState: 'AVAILABLE',
            thumbnailImageUrl: null,
            likeCount: 0,
            exchangeRequestCount: 0,
            isLiked: false,
            createdAt: '2026-10-13T10:30:00',
          },
        ],
        nextCursor: null,
        hasNext: false,
      }),
    ),
  )
  await page.route('**/bff/smart-search', (route) =>
    route.fulfill(json({ items: [] })),
  )
}

test('검색 결과에서 수정하기 후 뒤로가기를 누르면 물품 검색 화면으로 돌아간다', async ({
  page,
}) => {
  await mockSmartSearch(page)

  // 1. 물품 검색 화면에서 AI 스마트 검색으로 진입한다.
  await page.goto(SEARCH_PATH)
  await page.getByRole('link', { name: /AI 스마트 검색/ }).click()
  await expect(page).toHaveURL(SMART_SEARCH_PATH)

  // 2. 그룹과 내 물품을 선택하고 검색해 결과 화면으로 이동한다.
  const groupSelect = page.getByRole('combobox', { name: '검색할 그룹' })
  await expect(groupSelect).toBeEnabled()
  await groupSelect.selectOption('1')
  await page.getByRole('checkbox', { name: /아이폰 충전기/ }).check()
  await page.getByRole('button', { name: '검색하기' }).click()
  await expect(page).toHaveURL(RESULT_PATH)
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()

  // 3. 검색 조건의 수정하기로 스마트 검색 화면에 돌아온다.
  await page.getByRole('main').getByText('수정하기', { exact: true }).click()
  await expect(page).toHaveURL(SMART_SEARCH_PATH)
  await expect(page.getByRole('heading', { name: '스마트 검색' })).toBeVisible()

  // 4. 수정하기가 히스토리를 쌓지 않았다면, 좌측 상단 뒤로가기로
  //    결과 화면이 아니라 물품 검색 화면으로 돌아가야 한다.
  await page.locator('header button').first().click()
  await expect(page).toHaveURL(SEARCH_PATH)
})
