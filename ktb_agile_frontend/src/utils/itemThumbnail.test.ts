import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import axios from 'axios'
import { createItemThumbnail, uploadItemThumbnail } from './itemThumbnail'
import type { SelectedImage } from '@/types/item'

const bitmap = { width: 4000, height: 3000, close: vi.fn() }
let drawImage: ReturnType<typeof vi.fn>
beforeEach(() => {
  bitmap.width = 4000
  bitmap.height = 3000
  drawImage = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap))
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage,
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    function (callback, type) {
      callback(new Blob(['thumbnail'], { type }))
    },
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('원본을 유지하며 긴 변 224px, 원본 비율의 WebP를 만든다', async () => {
  const source = new File(['original'], 'original.png', { type: 'image/png' })
  const result = await createItemThumbnail(source)
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 224, 168)
  expect(result.type).toBe('image/webp')
  expect(result.name).toBe('item-thumbnail.webp')
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledOnce()
  expect(source.name).toBe('original.png')
  expect(bitmap.close).toHaveBeenCalledOnce()
})
it.each(['png', 'null'])(
  'WebP 생성 결과가 %s이면 JPEG로 대체한다',
  async (result) => {
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback, type) =>
        callback(
          type === 'image/webp'
            ? result === 'png'
              ? new Blob(['fallback'], { type: 'image/png' })
              : null
            : new Blob(['jpeg'], { type: 'image/jpeg' }),
        ),
      )
    const file = await createItemThumbnail(new Blob())
    expect(file.type).toBe('image/jpeg')
    expect(file.name).toBe('item-thumbnail.jpg')
    expect(toBlob).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      'image/webp',
      0.8,
    )
    expect(toBlob).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      'image/jpeg',
      0.8,
    )
    expect(bitmap.close).toHaveBeenCalledOnce()
  },
)
it('JPEG 대체도 미지원이면 다른 형식을 잘못 저장하지 않고 실패한다', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(new Blob(['unsupported'], { type: 'image/png' })),
  )
  await expect(createItemThumbnail(new Blob())).rejects.toThrow('썸네일 변환')
  expect(bitmap.close).toHaveBeenCalledOnce()
})
it('작은 이미지를 확대하지 않는다', async () => {
  bitmap.width = 80
  bitmap.height = 120
  await createItemThumbnail(new Blob())
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 80, 120)
})
it('변환 실패 시 비트맵을 해제한다', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(null),
  )
  await expect(createItemThumbnail(new Blob())).rejects.toThrow('썸네일 변환')
  expect(bitmap.close).toHaveBeenCalledOnce()
})
it.each(['image/webp', 'image/jpeg'])(
  '%s 형식으로 업로드하고 재시도에서는 업로드를 생략한다',
  async (contentType) => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['thumbnail'], { type: contentType })),
    )
    const extension = contentType === 'image/webp' ? 'webp' : 'jpg'
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        data: [
          {
            uploadUrl: 'https://s3.example/thumbnail',
            objectKey: `images/1/thumb.${extension}`,
            requiredHeaders: { 'Content-Type': contentType },
          },
        ],
      },
    })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({})
    let images: SelectedImage[] = [
      {
        id: 'first',
        preview: 'preview',
        file: new File(['original'], 'original.png'),
        objectKey: 'images/1/original.png',
      },
    ]
    const setImages = vi.fn((update) => {
      images = typeof update === 'function' ? update(images) : update
    })
    await uploadItemThumbnail(images[0], setImages, 'token')
    expect(images[0].objectKey).toBe('images/1/original.png')
    expect(images[0].thumbnailObjectKey).toBe(`images/1/thumb.${extension}`)
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/images/presigned-urls'),
      { images: [{ contentType }] },
      expect.anything(),
    )
    expect(put).toHaveBeenCalledWith(
      'https://s3.example/thumbnail',
      expect.objectContaining({
        name: `item-thumbnail.${extension}`,
        type: contentType,
      }),
      { headers: { 'Content-Type': contentType } },
    )
    await uploadItemThumbnail(images[0], setImages, 'token')
    expect(post).toHaveBeenCalledOnce()
    expect(put).toHaveBeenCalledOnce()
  },
)
it('기존 대표 이미지로 바뀌면 URL에서 원본을 읽어 썸네일을 만든다', async () => {
  const original = new Blob(['original'])
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => original })
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      data: [{ uploadUrl: 'upload', objectKey: 'thumb', requiredHeaders: {} }],
    },
  })
  vi.spyOn(axios, 'put').mockResolvedValue({})
  await uploadItemThumbnail(
    { id: 'existing', imageId: 2, preview: 'https://s3.example/original' },
    vi.fn(),
    'token',
  )
  expect(fetchMock).toHaveBeenCalledWith('https://s3.example/original')
  expect(createImageBitmap).toHaveBeenCalledWith(original)
})
