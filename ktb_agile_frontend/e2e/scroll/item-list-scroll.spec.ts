import { writeFile } from 'node:fs/promises'
import { expect, test, type TestInfo } from '@playwright/test'
import {
  itemCards,
  mockScrollItems,
  flickScroll,
  startListProbe,
  stopListProbe,
} from '../helpers/list-scroll'

// 문제를 자동 판정하지 못해도 영상과 DOM 기록을 남긴다.
test.use({
  viewport: { width: 390, height: 700 },
  trace: 'on',
  video: 'on',
})
test.describe.configure({ mode: 'serial', retries: 0 })

async function attachJson(testInfo: TestInfo, name: string, value: unknown) {
  const path = testInfo.outputPath(name)
  await writeFile(path, JSON.stringify(value, null, 2))
  await testInfo.attach(name, { path, contentType: 'application/json' })
}

const scenarios = [
  {
    start: '진입 직후',
    pattern: 'three-down-two-up',
    label: '아래 3회 → 위 2회 빠른 넘김',
  },
  {
    start: '첫 목록 표시 후',
    pattern: 'three-down-two-up',
    label: '아래 3회 → 위 2회 빠른 넘김',
  },
  {
    start: '첫 목록 표시 후',
    pattern: 'rapid-reversal',
    label: '대기 없이 빠른 넘김 방향 급전환',
  },
] as const

for (const { start, pattern, label } of scenarios) {
  test(`${start}: ${label}`, async ({ page }, testInfo) => {
    await mockScrollItems(page)
    await page.goto('/pages/items?groupId=1', { waitUntil: 'domcontentloaded' })
    if (start === '첫 목록 표시 후') {
      await expect(page.locator(itemCards).first()).toBeVisible()
    }

    await startListProbe(page)
    let samples: Awaited<ReturnType<typeof stopListProbe>> = []
    try {
      const gestures = await test.step(label, () => flickScroll(page, pattern))
      await attachJson(testInfo, 'scroll-inputs.json', gestures)
    } finally {
      samples = await stopListProbe(page)
      await attachJson(testInfo, 'scroll-dom-samples.json', samples)
      const firstReady = samples.findIndex((sample) => sample.domCount > 0)
      const readySamples = firstReady < 0 ? [] : samples.slice(firstReady)
      await attachJson(testInfo, 'scroll-summary.json', {
        start,
        pattern,
        sampleCount: samples.length,
        maxFrameCallbackGapMs: Math.max(0, ...samples.map((s) => s.frameGapMs)),
        missingDomAfterReady: readySamples.filter((s) => s.domCount === 0),
        noCardsInViewportAfterReady: readySamples.filter(
          (s) => s.viewportCount === 0,
        ),
        note: 'DOM/좌표와 rAF 관찰값입니다. 실제 Paint, FPS, 배경 노출 여부를 확정하지 않습니다.',
      })
    }

    expect(samples.length, '스크롤 중 DOM 관찰 기록').toBeGreaterThan(0)
    const positions = samples.map((sample) => sample.scrollY)
    expect(
      Math.max(...positions),
      '실제로 아래로 스크롤되어야 함',
    ).toBeGreaterThan(0)
    expect(
      positions.some(
        (position, index) => index > 0 && position < positions[index - 1],
      ),
      '실제로 위로도 스크롤되어야 함',
    ).toBe(true)
    const firstReady = samples.findIndex((sample) => sample.domCount > 0)
    expect(firstReady, '물품 DOM이 표시되어야 함').toBeGreaterThanOrEqual(0)
    expect(
      samples.slice(firstReady).filter((sample) => sample.domCount === 0),
      '표시된 목록 전체가 스크롤 중 DOM에서 사라지면 안 됨',
    ).toEqual([])
    await expect(page.locator(itemCards).first()).toBeAttached()
  })
}
