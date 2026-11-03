import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import axios from 'axios'
import {
  createItemThumbnail,
  uploadItemDetailThumbnail,
  uploadItemThumbnail,
} from './itemThumbnail'
import { createThumbnail } from './thumbnail'
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
it.each(['image/png', null])(
  'WebP 생성 실패(%s) 시 다른 형식으로 업로드하지 않는다',
  async (type) => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(type ? new Blob(['unsupported'], { type }) : null),
    )
    await expect(createItemThumbnail(new Blob())).rejects.toThrow(
      'WebP 이미지 변환',
    )
    expect(bitmap.close).toHaveBeenCalledOnce()
  },
)
it('작은 이미지를 확대하지 않는다', async () => {
  bitmap.width = 80
  bitmap.height = 120
  await createItemThumbnail(new Blob())
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 80, 120)
})
it('공통 함수에 최대 크기와 품질, 파일명을 지정해 썸네일을 만든다', async () => {
  bitmap.width = 3000
  bitmap.height = 4000
  const result = await createThumbnail(new Blob(), {
    maxSize: 512,
    quality: 0.6,
    fileName: 'profile-thumbnail.webp',
  })
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 384, 512)
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
    expect.any(Function),
    'image/webp',
    0.6,
  )
  expect(result.name).toBe('profile-thumbnail.webp')
})
it('물품용 기본 설정도 필요한 옵션만 덮어쓸 수 있다', async () => {
  const result = await createItemThumbnail(new Blob(), {
    maxSize: 400,
    quality: 0.4,
  })
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 400, 300)
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
    expect.any(Function),
    'image/webp',
    0.4,
  )
  expect(result.name).toBe('item-thumbnail.webp')
})
it.each([0, -1, 1.5, NaN, Infinity])(
  '잘못된 최대 크기(%s)는 이미지 처리 전에 거부한다',
  async (maxSize) => {
    await expect(createThumbnail(new Blob(), { maxSize })).rejects.toThrow(
      '최대 크기',
    )
    expect(createImageBitmap).not.toHaveBeenCalled()
  },
)
it.each([-0.1, 1.1, NaN, Infinity])(
  '잘못된 품질(%s)은 이미지 처리 전에 거부한다',
  async (quality) => {
    await expect(
      createThumbnail(new Blob(), { maxSize: 224, quality }),
    ).rejects.toThrow('품질')
    expect(createImageBitmap).not.toHaveBeenCalled()
  },
)
it('변환 실패 시 비트맵을 해제한다', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(null),
  )
  await expect(createItemThumbnail(new Blob())).rejects.toThrow(
    'WebP 이미지 변환',
  )
  expect(bitmap.close).toHaveBeenCalledOnce()
})
it.each(['image/webp'])(
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

it('모든 사진의 상세용 썸네일을 1280px로 생성하고 목록용 키와 별도로 기억한다', async () => {
  let images: SelectedImage[] = ['first', 'second', 'third'].map((id) => ({
    id,
    preview: id,
    file: new File([id], `${id}.png`, { type: 'image/png' }),
    objectKey: `images/1/${id}.webp`,
    ...(id === 'first' ? { thumbnailObjectKey: 'images/1/list.webp' } : {}),
  }))
  const post = vi.spyOn(axios, 'post').mockImplementation(async () => ({
    data: {
      data: [
        {
          uploadUrl: `https://s3.example/detail-${post.mock.calls.length}`,
          objectKey: `images/1/detail-${post.mock.calls.length}.webp`,
          requiredHeaders: {
            'Content-Type': 'image/webp',
            'x-amz-tagging': 'pending=true',
          },
        },
      ],
    },
  }))
  const put = vi.spyOn(axios, 'put').mockResolvedValue({})
  const setImages = vi.fn((update) => {
    images = typeof update === 'function' ? update(images) : update
  })
  for (const image of images) {
    await uploadItemDetailThumbnail(image, setImages, 'token')
  }
  expect(drawImage).toHaveBeenCalledTimes(3)
  expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1280, 960)
  expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(
    expect.any(Function),
    'image/webp',
    0.8,
  )
  expect(put).toHaveBeenCalledWith(
    'https://s3.example/detail-1',
    expect.objectContaining({
      name: 'item-detail-thumbnail.webp',
      type: 'image/webp',
    }),
    {
      headers: {
        'Content-Type': 'image/webp',
        'x-amz-tagging': 'pending=true',
      },
    },
  )
  expect(images[0].thumbnailObjectKey).toBe('images/1/list.webp')
  expect(images.map((image) => image.detailThumbnailObjectKey)).toEqual([
    'images/1/detail-1.webp',
    'images/1/detail-2.webp',
    'images/1/detail-3.webp',
  ])
  for (const image of images) {
    await uploadItemDetailThumbnail(image, setImages, 'token')
  }
  expect(post).toHaveBeenCalledTimes(3)
  expect(put).toHaveBeenCalledTimes(3)
})

it('상세용 업로드 실패 시 키를 저장하지 않아 다시 시도할 수 있다', async () => {
  const image: SelectedImage = {
    id: 'first',
    preview: 'preview',
    file: new File(['original'], 'original.png'),
  }
  vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      data: [{ uploadUrl: 'upload', objectKey: 'detail', requiredHeaders: {} }],
    },
  })
  vi.spyOn(axios, 'put').mockRejectedValue(new Error('upload failed'))
  const setImages = vi.fn()
  await expect(
    uploadItemDetailThumbnail(image, setImages, 'token'),
  ).rejects.toThrow('upload failed')
  expect(setImages).not.toHaveBeenCalled()
})
