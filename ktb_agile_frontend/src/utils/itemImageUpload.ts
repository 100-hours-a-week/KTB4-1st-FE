import { ITEM_ERRORS } from '@/constants/errors/item'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import type { Dispatch, SetStateAction } from 'react'
import type { SelectedImage } from '@/types/item'

type PresignedUpload = {
  uploadUrl: string
  objectKey: string
  expiresInSeconds: number
  requiredHeaders: Record<string, string>
}

export async function uploadImagesToS3(
  images: SelectedImage[],
  setImages: Dispatch<SetStateAction<SelectedImage[]>>,
  accessToken: string,
): Promise<string[]> {
  if (images.length === 0 || images.length > 3) {
    throw new Error(ITEM_ERRORS.IMAGE_COUNT_INVALID)
  }

  const pendingImages = images.filter((image) => {
    return !image.objectKey
  })
  if (pendingImages.some((image) => !image.file)) {
    throw new Error(
      ITEM_ERRORS.EXISTING_IMAGE_UPLOAD_UNSUPPORTED,
    )
  }
  let presignedUploads: PresignedUpload[] = []

  // 아직 S3에 올리지 않은 사진의 업로드 URL만 발급받습니다.
  if (pendingImages.length > 0) {
    const response = await axios.post<{ data: PresignedUpload[] }>(
      `${API_BASE_URL}/images/presigned-urls`,
      {
        images: pendingImages.map((image) => {
          return { contentType: image.file!.type }
        }),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )

    presignedUploads = response.data.data
    if (presignedUploads.length !== pendingImages.length) {
      throw new Error(ITEM_ERRORS.UPLOAD_URL_COUNT_MISMATCH)
    }
  }

  const objectKeys: string[] = []
  let uploadIndex = 0

  for (const image of images) {
    // 이미 업로드한 사진은 기존 objectKey를 그대로 사용합니다.
    if (image.objectKey) {
      objectKeys.push(image.objectKey)
      continue
    }

    const upload = presignedUploads[uploadIndex]
    uploadIndex += 1

    await axios.put(upload.uploadUrl, image.file, {
      headers: upload.requiredHeaders,
    })

    // 업로드 성공을 기억해 두면 재시도할 때 같은 사진을 다시 올리지 않습니다.
    setImages(function saveUploadedImage(currentImages) {
      return currentImages.map((currentImage) => {
        if (currentImage.id === image.id) {
          return { ...currentImage, objectKey: upload.objectKey }
        }
        return currentImage
      })
    })

    objectKeys.push(upload.objectKey)
  }

  return objectKeys
}
