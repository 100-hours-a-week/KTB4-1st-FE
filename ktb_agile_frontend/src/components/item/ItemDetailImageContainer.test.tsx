import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ItemDetailImageContainer from './ItemDetailImageContainer'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})

const images = [1, 2, 3].map((id) => ({
  imageId: id,
  imageUrl: `/original-${id}.jpg`,
  detailThumbnailUrl: `/thumbnail-${id}.webp`,
  displayOrder: id,
}))

it('모든 썸네일 요청이 끝난 뒤 클릭 없이 원본을 낮은 우선순위로 준비한다', () => {
  const { container } = render(
    <ItemDetailImageContainer images={images} isLoading={false} onBack={() => {}} />,
  )
  const [first, second, third] = container.querySelectorAll('img')
  expect(first.getAttribute('src')).toBe('/thumbnail-1.webp')
  expect(second.hasAttribute('src')).toBe(false)
  expect(container.querySelector('[hidden] img')).toBeNull()

  fireEvent.load(first)
  expect(second.getAttribute('src')).toBe('/thumbnail-2.webp')
  expect(third.getAttribute('src')).toBe('/thumbnail-3.webp')
  fireEvent.load(second)
  expect(container.querySelector('[hidden] img')).toBeNull()
  fireEvent.error(third)

  const originals = [...container.querySelectorAll('[hidden] img')]
  expect(originals.map((image) => image.getAttribute('src'))).toEqual(
    images.map((image) => image.imageUrl),
  )
  for (const image of originals) {
    expect(image.getAttribute('fetchpriority')).toBe('low')
    expect(image.getAttribute('loading')).toBe('eager')
  }
})

it('썸네일 로딩 중 클릭해도 선택한 원본을 즉시 요청한다', () => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: vi.fn() },
    close: { configurable: true, value: vi.fn() },
  })
  const { container, getByRole } = render(
    <ItemDetailImageContainer images={images} isLoading={false} onBack={() => {}} />,
  )
  fireEvent.click(getByRole('region', { name: '물품 사진' }))
  const original = container.querySelector('dialog img')!
  expect(original.getAttribute('src')).toBe('/original-1.jpg')
  expect(original.getAttribute('fetchpriority')).toBe('high')
})

const placeholderSelector = 'img[aria-hidden="true"]'

it('상세 응답 전에는 목록 썸네일을 자리 표시 이미지로 보여 준다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      isLoading
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  const placeholder = container.querySelector(placeholderSelector)
  expect(placeholder?.getAttribute('src')).toBe('/list-thumbnail.webp')
  expect(placeholder?.getAttribute('alt')).toBe('')
})

it('첫 상세 사진이 로드되면 자리 표시 이미지를 숨긴다', () => {
  const { container, rerender } = render(
    <ItemDetailImageContainer
      isLoading
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  rerender(
    <ItemDetailImageContainer
      images={images}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={1}
    />,
  )
  // 상세 사진이 내려오는 동안에는 자리 표시를 유지한다.
  expect(container.querySelector(placeholderSelector)).not.toBeNull()

  fireEvent.load(container.querySelector('[role="region"] img')!)
  expect(container.querySelector(placeholderSelector)).toBeNull()
})

it('첫 상세 사진 요청이 실패해도 자리 표시 이미지를 숨긴다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={images}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  fireEvent.error(container.querySelector('[role="region"] img')!)
  expect(container.querySelector(placeholderSelector)).toBeNull()
})

it('대표 사진이 첫 사진과 다르면 자리 표시 이미지를 쓰지 않는다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={images}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={2}
    />,
  )
  expect(container.querySelector(placeholderSelector)).toBeNull()
})

it('상세 조회가 실패하거나 사진이 없으면 자리 표시 이미지를 숨긴다', () => {
  const { container, rerender } = render(
    <ItemDetailImageContainer
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  expect(container.querySelector(placeholderSelector)).toBeNull()

  rerender(
    <ItemDetailImageContainer
      images={[]}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  expect(container.querySelector(placeholderSelector)).toBeNull()
})
