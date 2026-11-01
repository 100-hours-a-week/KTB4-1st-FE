import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import ItemImageCarousel from './ItemImageCarousel'

afterEach(cleanup)

const images = [
  { imageId: 3, imageUrl: '/third.png', displayOrder: 3 },
  { imageId: 1, imageUrl: '/first.jpg', displayOrder: 1 },
  { imageId: 2, imageUrl: '/second.jpg', displayOrder: 2 },
]

it('첫 사진을 우선 요청하고 완료 후 나머지 사진 주소를 제공한다', () => {
  const { container } = render(<ItemImageCarousel images={images} />)
  const [first, second, third] = container.querySelectorAll('img')
  expect(first.getAttribute('src')).toBe('/first.jpg')
  expect(first.getAttribute('fetchpriority')).toBe('high')
  expect(second.hasAttribute('src')).toBe(false)
  expect(third.hasAttribute('src')).toBe(false)

  fireEvent.load(first)

  expect(second.getAttribute('src')).toBe('/second.jpg')
  expect(third.getAttribute('src')).toBe('/third.png')
  expect(second.getAttribute('fetchpriority')).toBe('low')
  expect(third.getAttribute('fetchpriority')).toBe('low')
})

it('첫 사진 요청 실패 후에도 나머지 사진을 준비한다', () => {
  const { container } = render(<ItemImageCarousel images={images} />)
  fireEvent.error(container.querySelector('img')!)
  expect(
    [...container.querySelectorAll('img')].map((img) =>
      img.getAttribute('src'),
    ),
  ).toEqual(['/first.jpg', '/second.jpg', '/third.png'])
})

it('첫 사진 완료 전 이동한 사진은 즉시 요청하고 돌아와도 주소를 유지한다', () => {
  const { container, getByRole } = render(<ItemImageCarousel images={images} />)
  const region = getByRole('region')
  const [, second, third] = container.querySelectorAll('img')
  fireEvent.keyDown(region, { key: 'ArrowRight' })
  expect(second.getAttribute('src')).toBe('/second.jpg')
  expect(second.getAttribute('fetchpriority')).toBe('high')
  expect(third.hasAttribute('src')).toBe(false)
  fireEvent.keyDown(region, { key: 'ArrowLeft' })
  expect(second.getAttribute('src')).toBe('/second.jpg')
})

it('확대 화면은 선택한 사진을 먼저 요청한다', () => {
  const { container } = render(
    <ItemImageCarousel images={images} initialImageId={2} />,
  )
  const [first, second, third] = container.querySelectorAll('img')
  expect(first.hasAttribute('src')).toBe(false)
  expect(second.getAttribute('src')).toBe('/second.jpg')
  expect(second.getAttribute('fetchpriority')).toBe('high')
  expect(third.hasAttribute('src')).toBe(false)
  fireEvent.load(second)
  expect(first.getAttribute('src')).toBe('/first.jpg')
  expect(third.getAttribute('src')).toBe('/third.png')
})
