import axios from 'axios'
import { createThumbnail, type ThumbnailOptions } from './thumbnail'
import type { Dispatch, SetStateAction } from 'react'
import { API_BASE_URL } from '@/config/api'
import type { SelectedImage } from '@/types/item'

// 목록의 112px 이미지에 2배 밀도를 확보하고 원본 비율을 유지합니다.
export const ITEM_THUMBNAIL_MAX_SIZE = 224
export const ITEM_DETAIL_THUMBNAIL_MAX_SIZE = 1280
// 이미지 최적화를 위해 용도별로 WebP 압축 품질을 나눕니다.
export const ITEM_THUMBNAIL_QUALITY = 0.5
export const ITEM_DETAIL_THUMBNAIL_QUALITY = 0.6

export async function createItemThumbnail(
  source: Blob,
  options: Partial<ThumbnailOptions> = {},
): Promise<File> {
  return createThumbnail(source, {
    maxSize: ITEM_THUMBNAIL_MAX_SIZE,
    quality: ITEM_THUMBNAIL_QUALITY,
    fileName: 'item-thumbnail.webp',
    background: '#fff',
    ...options,
  })
}

export async function uploadItemThumbnail(
  image: SelectedImage,
  setImages: Dispatch<SetStateAction<SelectedImage[]>>,
  accessToken: string,
): Promise<string> {
  return uploadThumbnail(image, setImages, accessToken, 'thumbnailObjectKey', {
    maxSize: ITEM_THUMBNAIL_MAX_SIZE,
    quality: ITEM_THUMBNAIL_QUALITY,
    fileName: 'item-thumbnail.webp',
  })
}

export async function uploadItemDetailThumbnail(
  image: SelectedImage,
  setImages: Dispatch<SetStateAction<SelectedImage[]>>,
  accessToken: string,
): Promise<string> {
  return uploadThumbnail(
    image,
    setImages,
    accessToken,
    'detailThumbnailObjectKey',
    {
      maxSize: ITEM_DETAIL_THUMBNAIL_MAX_SIZE,
      quality: ITEM_DETAIL_THUMBNAIL_QUALITY,
      fileName: 'item-detail-thumbnail.webp',
    },
  )
}

async function uploadThumbnail(
  image: SelectedImage,
  setImages: Dispatch<SetStateAction<SelectedImage[]>>,
  accessToken: string,
  keyField: 'thumbnailObjectKey' | 'detailThumbnailObjectKey',
  options: ThumbnailOptions,
): Promise<string> {
  const existingKey = image[keyField]
  if (existingKey) return existingKey
  let source: Blob
  if (image.file) {
    source = image.file
  } else {
    // 수정 화면의 기존 이미지도 원본을 교체하지 않고 별도 썸네일만 생성합니다.
    const response = await fetch(image.preview)
    if (!response.ok)
      throw new Error('썸네일용 원본 이미지를 불러오지 못했습니다.')
    source = await response.blob()
  }
  const thumbnail = await createItemThumbnail(source, options)
  const response = await axios.post<{
    data: {
      uploadUrl: string
      objectKey: string
      requiredHeaders: Record<string, string>
    }[]
  }>(
    `${API_BASE_URL}/images/presigned-urls`,
    {
      images: [{ contentType: thumbnail.type }],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  )
  if (response.data.data.length !== 1)
    throw new Error('썸네일 업로드 URL을 발급받지 못했습니다.')
  const upload = response.data.data[0]
  await axios.put(upload.uploadUrl, thumbnail, {
    headers: upload.requiredHeaders,
  })
  // 등록 요청이 실패해도 업로드에 성공한 썸네일은 재사용합니다.
  setImages((current) =>
    current.map((entry) =>
      entry.id === image.id
        ? { ...entry, [keyField]: upload.objectKey }
        : entry,
    ),
  )
  return upload.objectKey
}
