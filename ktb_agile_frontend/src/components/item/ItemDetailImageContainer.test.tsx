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

it('첫 상세 사진 요청이 실패하면 목록 썸네일을 그대로 유지한다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={images}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
    />,
  )
  fireEvent.error(container.querySelector('[role="region"] img')!)
  // 실패를 성공으로 보지 않으므로 임시 이미지를 지우지 않는다.
  expect(
    container.querySelector(placeholderSelector)?.getAttribute('src'),
  ).toBe('/list-thumbnail.webp')
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

const initialImageUrl = '/thumbnail-1.webp?signature=list'
const signedImages = images.map((image) => ({
  ...image,
  detailThumbnailUrl: `${image.detailThumbnailUrl}?signature=detail`,
}))
const listLayer = `img[aria-hidden="true"][src="/list-thumbnail.webp"]`
const initialLayer = `img[aria-hidden="true"][src="${initialImageUrl}"]`
const firstSlide = (container: HTMLElement) =>
  container.querySelector('[role="region"] img')!

it('상세 썸네일을 받는 동안 목록 썸네일을 아래에 깔고, 받아지면 목록 썸네일을 지운다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      isLoading
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      initialImageUrl={initialImageUrl}
    />,
  )
  const layers = [...container.querySelectorAll(placeholderSelector)]
  // 목록 썸네일이 아래층, 상세 썸네일이 위층이다.
  expect(layers.map((layer) => layer.getAttribute('src'))).toEqual([
    '/list-thumbnail.webp',
    initialImageUrl,
  ])

  fireEvent.load(container.querySelector(initialLayer)!)
  expect(container.querySelector(listLayer)).toBeNull()
  expect(container.querySelector(initialLayer)).not.toBeNull()
})

it('상세 응답이 먼저 와도 상세 썸네일이 그려지기 전까지 목록 썸네일을 유지한다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={signedImages}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={1}
      initialImageUrl={initialImageUrl}
    />,
  )
  // 서명 값만 다른 같은 사진이므로 첫 사진은 미리 받은 주소를 그대로 쓴다.
  expect(firstSlide(container).getAttribute('src')).toBe(initialImageUrl)
  expect(container.querySelector(listLayer)).not.toBeNull()

  fireEvent.load(firstSlide(container))
  expect(container.querySelector(placeholderSelector)).toBeNull()
  // 나머지 사진은 상세 응답의 주소를 쓴다.
  const [, second] = container.querySelectorAll('[role="region"] img')
  expect(second.getAttribute('src')).toBe('/thumbnail-2.webp?signature=detail')
})

it('미리 받은 주소가 첫 사진과 다른 사진이면 상세 응답의 주소를 쓰고 위층을 지운다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={signedImages}
      isLoading={false}
      onBack={() => {}}
      initialImageUrl="/other-image.webp?signature=list"
    />,
  )
  expect(firstSlide(container).getAttribute('src')).toBe(
    '/thumbnail-1.webp?signature=detail',
  )
  expect(container.querySelector(placeholderSelector)).toBeNull()
})

it('상세 응답 전에 미리 받은 주소가 실패하면 목록 썸네일을 유지하고, 응답 후 상세 응답의 주소로 복구한다', () => {
  const { container, rerender } = render(
    <ItemDetailImageContainer
      isLoading
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      initialImageUrl={initialImageUrl}
    />,
  )
  fireEvent.error(container.querySelector(initialLayer)!)
  expect(container.querySelector(initialLayer)).toBeNull()
  expect(container.querySelector(listLayer)).not.toBeNull()

  rerender(
    <ItemDetailImageContainer
      images={signedImages}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={1}
      initialImageUrl={initialImageUrl}
    />,
  )
  expect(firstSlide(container).getAttribute('src')).toBe(
    '/thumbnail-1.webp?signature=detail',
  )
  expect(container.querySelector(listLayer)).not.toBeNull()
  fireEvent.load(firstSlide(container))
  expect(container.querySelector(placeholderSelector)).toBeNull()
})

it('상세 응답 후 캐러셀에서 미리 받은 주소가 실패해도 상세 응답의 주소로 복구한다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={signedImages}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={1}
      initialImageUrl={initialImageUrl}
    />,
  )
  expect(firstSlide(container).getAttribute('src')).toBe(initialImageUrl)

  fireEvent.error(firstSlide(container))
  expect(firstSlide(container).getAttribute('src')).toBe(
    '/thumbnail-1.webp?signature=detail',
  )
  // 복구 중에도 목록 썸네일을 지우지 않는다.
  expect(container.querySelector(listLayer)).not.toBeNull()
})

it('상세 응답의 주소까지 실패하면 다시 바꾸지 않고 목록 썸네일을 유지한다', () => {
  const { container } = render(
    <ItemDetailImageContainer
      images={signedImages}
      isLoading={false}
      onBack={() => {}}
      placeholderImageUrl="/list-thumbnail.webp"
      thumbnailImageId={1}
      initialImageUrl={initialImageUrl}
    />,
  )
  fireEvent.error(firstSlide(container))
  fireEvent.error(firstSlide(container))
  expect(firstSlide(container).getAttribute('src')).toBe(
    '/thumbnail-1.webp?signature=detail',
  )
  expect(container.querySelector(listLayer)).not.toBeNull()
})
