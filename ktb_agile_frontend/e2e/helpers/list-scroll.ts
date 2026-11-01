import type { Page } from '@playwright/test'

export const itemCards = 'article:has(a[href^="/pages/items/"])'

export async function mockScrollItems(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('accessToken', 'scroll-test')
  })
  await page.route('**/*clarity.ms/**', (route) => route.abort())
  await page.route('**/bff/me/groups', (route) =>
    route.fulfill({
      json: {
        data: { groups: [{ groupId: 1, groupName: '스크롤 테스트 그룹' }] },
        error: null,
      },
    }),
  )
  await page.route('**/groups/1/items?**', async (route) => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get('cursor') || 0)
    const size = Number(url.searchParams.get('size') || 10)
    // 최초 로딩과 다음 페이지 로딩을 스크롤 중에 관찰할 수 있도록 지연한다.
    await new Promise((resolve) =>
      setTimeout(resolve, offset === 0 ? 1200 : 600),
    )
    const next = Math.min(offset + size, 120)
    await route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: {
        data: {
          items: Array.from({ length: next - offset }, (_, index) => ({
            itemId: offset + index + 1,
            title: `스크롤 물품 ${offset + index + 1}`,
            contentPreview: '스크롤 중 목록과 이미지가 유지되는지 확인합니다.',
            quantity: 1,
            owner: { userId: 1, nickname: '테스트 사용자' },
            itemState: 'AVAILABLE',
            thumbnailImageUrl: '/fox.webp',
            likeCount: 0,
            viewCount: 0,
            exchangeRequestCount: 0,
            isLiked: false,
            createdAt: '2026-10-30T00:00:00Z',
          })),
          nextCursor: next < 120 ? String(next) : null,
          hasNext: next < 120,
        },
        error: null,
      },
    })
  })
}

export async function startListProbe(page: Page) {
  await page.evaluate((selector) => {
    type Sample = {
      timeMs: number
      frameGapMs: number
      scrollY: number
      domCount: number
      viewportCount: number
      loading: boolean
      firstCardTop: number | null
      lastCardBottom: number | null
    }
    const probe = { samples: [] as Sample[], stopped: false }
    Object.assign(window, { __listScrollProbe: probe })
    const start = performance.now()
    let previous = start
    const sample = (now: number) => {
      if (probe.stopped) return
      const cards = [...document.querySelectorAll(selector)]
      const rects = cards.map((card) => card.getBoundingClientRect())
      const viewportCount = rects.filter(
        (rect) =>
          rect.height > 0 && rect.bottom > 80 && rect.top < innerHeight - 80,
      ).length
      probe.samples.push({
        timeMs: now - start,
        frameGapMs: now - previous,
        scrollY,
        domCount: cards.length,
        viewportCount,
        loading: /로딩 중|물품을 더 불러오는 중/.test(document.body.innerText),
        firstCardTop: rects[0]?.top ?? null,
        lastCardBottom: rects.at(-1)?.bottom ?? null,
      })
      previous = now
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, itemCards)
}

export async function stopListProbe(page: Page) {
  return page.evaluate(() => {
    const probe = (
      window as typeof window & {
        __listScrollProbe: {
          samples: {
            timeMs: number
            frameGapMs: number
            scrollY: number
            domCount: number
            viewportCount: number
            loading: boolean
            firstCardTop: number | null
            lastCardBottom: number | null
          }[]
          stopped: boolean
        }
      }
    ).__listScrollProbe
    probe.stopped = true
    return probe.samples
  })
}

export type FlickPattern = 'three-down-two-up' | 'rapid-reversal'

export async function flickScroll(page: Page, pattern: FlickPattern) {
  const { width, height } = page.viewportSize()!
  // 목록을 기다리는 hover()는 사용하지 않는다: 진입 직후 시나리오도 지원한다.
  await page.mouse.move(width / 2, height / 2)
  // 한 번의 빠른 넘김: 20ms 간격으로 300px씩 5회(목표 100ms/1,500px).
  const intervalMs = 20
  const stepsPerFlick = 5
  const distancePerStep = 300
  const directions =
    pattern === 'rapid-reversal' ? [1, -1, 1, 1, -1] : [1, 1, 1, -1, -1]
  const gestures = []
  const started = performance.now()
  for (const [index, direction] of directions.entries()) {
    const flickStarted = performance.now()
    for (let step = 0; step < stepsPerFlick; step++) {
      await page.mouse.wheel(0, direction * distancePerStep)
      const remaining =
        flickStarted + (step + 1) * intervalMs - performance.now()
      if (remaining > 0) await page.waitForTimeout(remaining)
    }
    gestures.push({
      direction: direction > 0 ? 'down' : 'up',
      startMs: flickStarted - started,
      durationMs: performance.now() - flickStarted,
      requestedDistancePx: direction * distancePerStep * stepsPerFlick,
    })
    if (pattern === 'three-down-two-up') {
      // 각 넘김은 1초 간격. 사이의 대기 중 추가 페이지 로딩도 관찰한다.
      const remaining = started + (index + 1) * 1000 - performance.now()
      if (remaining > 0) await page.waitForTimeout(remaining)
    }
  }
  // 마지막 입력이 처리되고 화면에 반영되는 구간까지 관찰한다.
  await page.waitForTimeout(500)
  return gestures
}
