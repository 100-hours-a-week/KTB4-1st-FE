import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ItemDetailsPage from './[itemId]/page'
import ItemEditPage from './[itemId]/edit/page'
import ItemRegister from './register/page'
import {
  uploadItemDetailThumbnail,
  uploadItemThumbnail,
} from '@/utils/itemThumbnail'
import type { ItemListItem, SelectedImage } from '@/types/item'
import { findCachedListThumbnail } from '@/queries/itemList'
import {
  getItemDetailImage,
  startItemDetailImage,
} from '@/utils/itemDetailPreview'

const router = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ itemId: '1' }),
  useSearchParams: () => new URLSearchParams(),
}))
const formState = vi.hoisted(() => ({
  images: undefined as SelectedImage[] | undefined,
}))
vi.mock('@/utils/itemThumbnail', () => {
  const uploadItemDetailThumbnail = vi.fn(
    async (image: SelectedImage) => `images/1/detail-${image.id}.webp`,
  )
  return {
    uploadItemThumbnail: vi.fn().mockResolvedValue('images/1/thumb.jpg'),
    uploadItemDetailThumbnail,
    // 실제 구현처럼 사진마다 상세용 썸네일을 올려 같은 순서의 objectKey와 연결합니다.
    uploadItemDetailThumbnails: async (
      images: SelectedImage[],
      objectKeys: string[],
    ) => {
      const result = []
      for (const [index, image] of images.entries()) {
        result.push({
          objectKey: objectKeys[index],
          detailThumbnailObjectKey: await uploadItemDetailThumbnail(image),
        })
      }
      return result
    },
  }
})
vi.mock('@/utils/itemImageUpload', () => ({
  uploadImagesToS3: async (images: SelectedImage[]) =>
    images.map((image) => `images/1/original-${image.id}.webp`),
}))
vi.mock('@/components/item/ItemRegisterForm', () => ({
  default: ({
    onSubmit,
    initialImages,
  }: {
    initialImages?: SelectedImage[]
    onSubmit: (values: unknown, context: unknown) => void
  }) => (
    <button
      onClick={() =>
        onSubmit(
          {
            title: '새 제목',
            content: '설명',
            quantity: 1,
            itemState: 'AVAILABLE',
            groupIds: [1],
            pace: 50,
            condition: 50,
          },
          {
            images: formState.images ??
              initialImages ?? [{ id: 'new', preview: 'preview' }],
            setImages: vi.fn(),
          },
        )
      }
    >
      테스트 저장
    </button>
  ),
}))
const item = {
  itemId: 1,
  title: '테스트 물품',
  content: '설명',
  quantity: 1,
  itemState: 'AVAILABLE',
  owner: { userId: 1, nickname: '작성자' },
  groups: [{ groupId: 1, groupName: '그룹' }],
  thumbnailImageId: 1,
  images: [
    { imageId: 1, imageUrl: 'https://example.com/one.jpg', displayOrder: 1 },
    { imageId: 2, imageUrl: 'https://example.com/two.jpg', displayOrder: 2 },
  ],
  likeCount: 0,
  isLiked: false,
  createdAt: '2026-10-26T00:00:00',
  exchangeUrgencyScore: 0.5,
  valueGapToleranceScore: 0.5,
}
let client: QueryClient
beforeEach(() => {
  formState.images = undefined
  client = new QueryClient()
  client.setQueryData(['items', 1, 1], {})
  client.setQueryData(['items', 2, 1], {})
  window.sessionStorage.setItem(
    'accessToken',
    `test.${window.btoa(JSON.stringify({ sub: '1' }))}.token`,
  )
  vi.spyOn(axios, 'get').mockImplementation(async (url) => ({
    data: {
      data: String(url).includes('/items/') ? item : { groups: item.groups },
    },
  }))
})
afterEach(() => {
  cleanup()
  client.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
const expectInvalidated = () => {
  expect(client.getQueryState(['items', 1, 1])?.isInvalidated).toBe(true)
  expect(client.getQueryState(['items', 2, 1])?.isInvalidated).toBe(true)
}

it('삭제 성공 시 목록 캐시를 무효화하고 목록으로 이동한다', async () => {
  vi.spyOn(axios, 'delete').mockResolvedValueOnce({ status: 204 })
  render(
    <QueryClientProvider client={client}>
      <ItemDetailsPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '삭제하기' }))
  fireEvent.click(screen.getAllByRole('button', { name: '삭제하기' }).at(-1)!)
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/items'),
  )
  expectInvalidated()
})

it('수정 성공 시 기존 및 새 그룹의 목록 캐시를 무효화한다', async () => {
  vi.spyOn(axios, 'put').mockResolvedValueOnce({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/items/1'),
  )
  expectInvalidated()
})

it('수정 성공 시 상세 화면이 수정 전 사진을 먼저 보여 주지 않도록 기억한 사진 주소를 지운다', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
    () => {},
  )
  startItemDetailImage(1, '/old-detail.webp')
  client.setQueryData(['items', 3, 1, 'latest'], {
    pages: [
      {
        items: [
          {
            itemId: 1,
            thumbnailImageUrl: '/old-list.webp',
            detailThumbnailImageUrl: '/old-detail.webp',
          } as ItemListItem,
        ],
      },
    ],
    pageParams: [''],
  })
  vi.spyOn(axios, 'put').mockResolvedValueOnce({ status: 204 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/items/1'),
  )
  expect(getItemDetailImage(1)).toBeNull()
  expect(findCachedListThumbnail(client, 1)).toBeNull()
})

it('삭제 성공 시 기억한 사진 주소를 지운다', async () => {
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
    () => {},
  )
  startItemDetailImage(1, '/old-detail.webp')
  vi.spyOn(axios, 'delete').mockResolvedValueOnce({ status: 204 })
  render(
    <QueryClientProvider client={client}>
      <ItemDetailsPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '삭제하기' }))
  fireEvent.click(screen.getAllByRole('button', { name: '삭제하기' }).at(-1)!)
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/items'),
  )
  expect(getItemDetailImage(1)).toBeNull()
})

it('등록 성공 시 목록 캐시를 무효화하고 목록으로 이동한다', async () => {
  vi.spyOn(axios, 'post')
    .mockResolvedValueOnce({
      data: { data: { isAppropriate: true, checkId: 'check' } },
    })
    .mockResolvedValueOnce({ status: 201 })
  render(
    <QueryClientProvider client={client}>
      <ItemRegister />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pages/items'))
  expectInvalidated()
})

it('등록 시 첫 사진의 별도 썸네일 키를 전송한다', async () => {
  vi.spyOn(axios, 'post')
    .mockResolvedValueOnce({
      data: { data: { isAppropriate: true, checkId: 'check' } },
    })
    .mockResolvedValueOnce({ status: 201 })
  render(
    <QueryClientProvider client={client}>
      <ItemRegister />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.push).toHaveBeenCalled())
  expect(uploadItemThumbnail).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'new' }),
    expect.any(Function),
    expect.any(String),
  )
  expect(axios.post).toHaveBeenLastCalledWith(
    expect.stringContaining('/items'),
    expect.objectContaining({ thumbnailObjectKey: 'images/1/thumb.jpg' }),
    expect.anything(),
  )
})
it('등록 시 모든 사진의 상세용 썸네일 키를 원본 업로드 결과에 연결해 전송한다', async () => {
  // 업로드 직후 현재 렌더의 이미지에는 아직 원본 objectKey가 없습니다.
  formState.images = ['third', 'first', 'second'].map((id) => ({
    id,
    preview: id,
  }))
  vi.spyOn(axios, 'post')
    .mockResolvedValueOnce({
      data: { data: { isAppropriate: true, checkId: 'check' } },
    })
    .mockResolvedValueOnce({ status: 201 })
  render(
    <QueryClientProvider client={client}>
      <ItemRegister />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pages/items'))
  expect(uploadItemDetailThumbnail).toHaveBeenCalledTimes(3)
  expect(axios.post).toHaveBeenLastCalledWith(
    expect.stringContaining('/items'),
    expect.objectContaining({
      objectKeys: [
        'images/1/original-third.webp',
        'images/1/original-first.webp',
        'images/1/original-second.webp',
      ],
      thumbnailObjectKey: 'images/1/thumb.jpg',
      imageDetailThumbnails: ['third', 'first', 'second'].map((id) => ({
        objectKey: `images/1/original-${id}.webp`,
        detailThumbnailObjectKey: `images/1/detail-${id}.webp`,
      })),
    }),
    expect.anything(),
  )
})

it('상세용 썸네일 업로드에 실패하면 물품 등록 요청을 보내지 않는다', async () => {
  vi.mocked(uploadItemDetailThumbnail).mockRejectedValueOnce(
    new Error('upload failed'),
  )
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({
    data: { data: { isAppropriate: true, checkId: 'check' } },
  })
  render(
    <QueryClientProvider client={client}>
      <ItemRegister />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(uploadItemDetailThumbnail).toHaveBeenCalledOnce())
  await waitFor(() => expect(console.error).toHaveBeenCalled())
  expect(post).toHaveBeenCalledTimes(1)
  expect(router.push).not.toHaveBeenCalled()
})

it('대표 사진이 그대로면 수정 시 썸네일 업로드를 생략한다', async () => {
  vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.replace).toHaveBeenCalled())
  expect(uploadItemThumbnail).not.toHaveBeenCalled()
  expect(axios.put).toHaveBeenCalledWith(
    expect.any(String),
    expect.not.objectContaining({ thumbnailObjectKey: expect.anything() }),
    expect.anything(),
  )
})
it('대표 사진을 다른 기존 사진으로 바꾸면 새 썸네일을 전송한다', async () => {
  formState.images = [
    { id: '2', imageId: 2, preview: 'https://example.com/two.jpg' },
  ]
  vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.replace).toHaveBeenCalled())
  expect(uploadItemThumbnail).toHaveBeenCalledWith(
    formState.images[0],
    expect.any(Function),
    expect.any(String),
  )
  expect(axios.put).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      imageIds: [2],
      thumbnailObjectKey: 'images/1/thumb.jpg',
    }),
    expect.anything(),
  )
})

it('수정 시 새로 추가한 사진은 업로드해 objectKeys와 상세용 썸네일로 함께 전송한다', async () => {
  formState.images = [
    { id: '1', imageId: 1, preview: 'https://example.com/one.jpg' },
    { id: 'added', preview: 'data:image/png;base64,added' },
  ]
  vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/items/1'),
  )
  // 대표 사진(첫 기존 사진)은 그대로이므로 대표 썸네일은 다시 만들지 않습니다.
  expect(uploadItemThumbnail).not.toHaveBeenCalled()
  expect(uploadItemDetailThumbnail).toHaveBeenCalledOnce()
  expect(axios.put).toHaveBeenCalledWith(
    expect.stringContaining('/items/1'),
    expect.objectContaining({
      imageIds: [1],
      objectKeys: ['images/1/original-added.webp'],
      imageDetailThumbnails: [
        {
          objectKey: 'images/1/original-added.webp',
          detailThumbnailObjectKey: 'images/1/detail-added.webp',
        },
      ],
    }),
    expect.anything(),
  )
})

it('기존 사진을 모두 지우고 새 사진만 남기면 새 첫 사진으로 대표 썸네일을 만든다', async () => {
  formState.images = [{ id: 'added', preview: 'data:image/png;base64,added' }]
  vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.replace).toHaveBeenCalled())
  expect(uploadItemThumbnail).toHaveBeenCalledWith(
    formState.images[0],
    expect.any(Function),
    expect.any(String),
  )
  expect(axios.put).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      imageIds: [],
      objectKeys: ['images/1/original-added.webp'],
      thumbnailObjectKey: 'images/1/thumb.jpg',
    }),
    expect.anything(),
  )
})

it('기존 사진만 수정하면 빈 objectKeys와 상세용 썸네일 목록을 보낸다', async () => {
  vi.spyOn(axios, 'put').mockResolvedValue({ status: 200 })
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  await waitFor(() => expect(router.replace).toHaveBeenCalled())
  expect(uploadItemDetailThumbnail).not.toHaveBeenCalled()
  expect(axios.put).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      imageIds: [1, 2],
      objectKeys: [],
      imageDetailThumbnails: [],
    }),
    expect.anything(),
  )
})

it('새 사진 업로드 요청이 실패하면 수정 요청을 보내지 않고 공통 실패 안내를 보여 준다', async () => {
  formState.images = [{ id: 'added', preview: 'data:image/png;base64,added' }]
  vi.mocked(uploadItemDetailThumbnail).mockRejectedValueOnce(
    new AxiosError('Request failed with status code 500'),
  )
  const put = vi.spyOn(axios, 'put')
  render(
    <QueryClientProvider client={client}>
      <ItemEditPage />
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByRole('button', { name: '테스트 저장' }))
  expect(
    await screen.findByText('물품 수정에 실패했습니다. 다시 시도해주세요.'),
  ).toBeDefined()
  expect(put).not.toHaveBeenCalled()
  expect(router.replace).not.toHaveBeenCalled()
})
