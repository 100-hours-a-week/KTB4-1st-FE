import { afterEach, expect, it, vi } from 'vitest'
import {
  getItemDetailImage,
  isSameImagePath,
  startItemDetailImage,
} from './itemDetailPreview'

afterEach(() => {
  vi.restoreAllMocks()
})

it('클릭한 물품의 상세 썸네일 요청을 시작하고 주소를 기억한다', () => {
  const sources: string[] = []
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
    function (value: string) {
      sources.push(value)
    },
  )

  startItemDetailImage(101, '/detail-101.webp?signature=a')

  expect(sources).toEqual(['/detail-101.webp?signature=a'])
  expect(getItemDetailImage(101)).toBe('/detail-101.webp?signature=a')
})

it('주소가 없으면 요청하지 않고 기억하지도 않는다', () => {
  const setSrc = vi
    .spyOn(HTMLImageElement.prototype, 'src', 'set')
    .mockImplementation(() => {})

  startItemDetailImage(102, null)
  startItemDetailImage(103, undefined)

  expect(setSrc).not.toHaveBeenCalled()
  expect(getItemDetailImage(102)).toBeNull()
  expect(getItemDetailImage(103)).toBeNull()
})

it('최근 20개 물품까지만 기억한다', () => {
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
    () => {},
  )
  for (let itemId = 200; itemId < 221; itemId += 1) {
    startItemDetailImage(itemId, `/detail-${itemId}.webp`)
  }

  expect(getItemDetailImage(200)).toBeNull()
  expect(getItemDetailImage(201)).toBe('/detail-201.webp')
  expect(getItemDetailImage(220)).toBe('/detail-220.webp')
})

it('서명 값만 다른 주소는 같은 이미지로, 경로가 다르면 다른 이미지로 본다', () => {
  expect(
    isSameImagePath(
      'https://cdn.example/images/3/a.webp?Expires=1&Signature=x',
      'https://cdn.example/images/3/a.webp?Expires=2&Signature=y',
    ),
  ).toBe(true)
  expect(isSameImagePath('/a.webp?signature=1', '/a.webp?signature=2')).toBe(
    true,
  )
  expect(
    isSameImagePath(
      'https://cdn.example/images/3/a.webp?Expires=1',
      'https://cdn.example/images/3/b.webp?Expires=1',
    ),
  ).toBe(false)
})
