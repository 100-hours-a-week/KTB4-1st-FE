import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ItemDetailsPage from './[itemId]/page'
import ItemEditPage from './[itemId]/edit/page'
import ItemRegister from './register/page'
import { uploadItemThumbnail } from '@/utils/itemThumbnail'
import type { SelectedImage } from '@/types/item'

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
vi.mock('@/utils/itemThumbnail', () => ({
  uploadItemThumbnail: vi.fn().mockResolvedValue('images/1/thumb.jpg'),
}))
vi.mock('@/utils/itemImageUpload', () => ({ uploadImagesToS3: async () => [] }))
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
