import axios from 'axios'
import type { Dispatch, SetStateAction } from 'react'
import { API_BASE_URL } from '@/config/api'
import type { SelectedImage } from '@/types/item'

// 목록의 112px 이미지에 2배 밀도를 확보하고 원본 비율을 유지합니다.
export const ITEM_THUMBNAIL_MAX_SIZE = 224

export async function createItemThumbnail(source: Blob): Promise<File> {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(
      1,
      ITEM_THUMBNAIL_MAX_SIZE / Math.max(bitmap.width, bitmap.height),
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('썸네일을 생성할 수 없습니다.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8))
    let blob = await encode('image/webp')
    // WebP 인코딩 미지원 브라우저는 PNG를 반환할 수 있어 실제 형식을 확인합니다.
    if (blob?.type !== 'image/webp') blob = await encode('image/jpeg')
    if (!blob || !['image/webp', 'image/jpeg'].includes(blob.type)) {
      throw new Error('썸네일 변환에 실패했습니다.')
    }
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `item-thumbnail.${extension}`, { type: blob.type })
  } finally {
    bitmap.close()
  }
}

export async function uploadItemThumbnail(
  image: SelectedImage,
  setImages: Dispatch<SetStateAction<SelectedImage[]>>,
  accessToken: string,
): Promise<string> {
  if (image.thumbnailObjectKey) return image.thumbnailObjectKey
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
  const thumbnail = await createItemThumbnail(source)
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
  // 등록/수정 요청이 실패해도 같은 대표 사진의 썸네일은 재업로드하지 않습니다.
  setImages((current) =>
    current.map((entry) =>
      entry.id === image.id
        ? { ...entry, thumbnailObjectKey: upload.objectKey }
        : entry,
    ),
  )
  return upload.objectKey
}
