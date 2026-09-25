'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { useFormContext } from 'react-hook-form'
import axios from 'axios'
import ModalDefault from '@/components/common/modal/Default'
import type {
  ItemRegisterFormValues,
  SelectedImage,
} from '../../../../../types/item'
import styles from './ImageRegister.module.css'

const MAX_IMAGES = 3
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const API_BASE_URL = 'http://127.0.0.1:8080'

type ImageRegisterProps = {
  images: SelectedImage[]
  setImages: Dispatch<SetStateAction<SelectedImage[]>>
}

type PresignedUrlData = {
  uploadUrl: string
  objectKey: string
  expiresInSeconds: number
  requiredHeaders: {
    'Content-Type': string
    'x-amz-tagging': string
  }
}

type ApiResponse<T> = {
  data: T
  error: null
}

type ImageAnalysisResult = {
  isAppropriate: boolean
  rejectionReason: string | null
  title: string | null
  content: string | null
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M8.2 6.5 9.4 4.7h5.2l1.2 1.8h2.7A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5V9a2.5 2.5 0 0 1 2.5-2.5h2.7Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m5.5 17 4.2-4.2 2.7 2.7 2-2 4.1 4.1" />
    </svg>
  )
}

//미리보기 이미지
function readImage(file: File): Promise<SelectedImage> {
  return new Promise(function createImagePreview(resolve, reject) {
    const reader = new FileReader()
    reader.onload = function handleReaderLoad() {
      resolve({ id: crypto.randomUUID(), file, preview: String(reader.result) })
    }
    reader.onerror = function handleReaderError() {
      reject(reader.error)
    }
    reader.readAsDataURL(file)
  })
}

export default function ImageRegister({
  images,
  setImages,
}: ImageRegisterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState('')
  const [isPhotoUploaded, setIsPhotoUploaded] = useState(images.length > 0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false)
  const router = useRouter()
  const { setValue } = useFormContext<ItemRegisterFormValues>()

  function openFilePicker() {
    if (rejectionReason !== null || isAnalyzing) return
    fileInputRef.current?.click()
  }

  function removeImage(imageId: string) {
    const updatedImages = images.filter(function excludeSelectedImage(item) {
      return item.id !== imageId
    })
    setImages(updatedImages)
    setIsPhotoUploaded(updatedImages.length > 0)
    if (updatedImages.length === 0) {
      setRejectionReason(null)
      setIsRejectionModalOpen(false)
      setImageError('')
    }
  }

  async function handleFillFromPhoto() {
    if (isAnalyzing || rejectionReason !== null || images.length === 0) return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    setIsAnalyzing(true)
    setImageError('')

    try {
      const presignedUrls = await getPresignedUrls(accessToken)
      const objectKeys = await uploadImagesToS3(presignedUrls)
      const analysis = await requestAIAnalysis(accessToken, objectKeys)

      if (!analysis.isAppropriate) {
        setRejectionReason(
          analysis.rejectionReason ?? '등록할 수 없는 이미지입니다.',
        )
        setIsRejectionModalOpen(true)
        setImageError('사진을 모두 삭제한 뒤 다시 선택해주세요.')
        return
      }
      if (!analysis.title || !analysis.content) {
        throw new Error('AI 분석 결과에 제목이나 내용이 없습니다.')
      }

      setValue('title', analysis.title, {
        shouldDirty: true,
        shouldValidate: true,
      })
      setValue('content', analysis.content, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch (error) {
      console.error(error)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.sessionStorage.removeItem('accessToken')
        router.replace('/auth/login')
        return
      }
      setImageError('이미지 분석에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function getPresignedUrls(
    accessToken: string,
  ): Promise<PresignedUrlData[]> {
    const imageContentTypes = images.map(function toContentType(image) {
      return { contentType: image.file.type }
    })
    const response = await axios.post<ApiResponse<PresignedUrlData[]>>(
      `${API_BASE_URL}/images/presigned-urls`,
      { images: imageContentTypes },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )

    if (response.data.data.length !== images.length) {
      throw new Error('발급된 업로드 URL 개수가 이미지 개수와 다릅니다.')
    }
    return response.data.data
  }

  async function uploadImagesToS3(
    presignedUrls: PresignedUrlData[],
  ): Promise<string[]> {
    const objectKeys: string[] = []

    for (let i = 0; i < presignedUrls.length; i++) {
      const upload = presignedUrls[i]
      await axios.put(upload.uploadUrl, images[i].file, {
        headers: upload.requiredHeaders,
      })
      objectKeys.push(upload.objectKey)
    }

    return objectKeys
  }

  async function requestAIAnalysis(
    accessToken: string,
    objectKeys: string[],
  ): Promise<ImageAnalysisResult> {
    const response = await axios.post<ImageAnalysisResult>(
      `${API_BASE_URL}/images/ai-analysis`,
      { objectKeys },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )

    return response.data
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (rejectionReason !== null || isAnalyzing) return

    if (
      files.some(function isNotSupportedImage(file) {
        return !ALLOWED_IMAGE_TYPES.includes(file.type)
      })
    ) {
      setImageError('JPEG, PNG, WebP 이미지만 선택할 수 있습니다.')
      return
    }
    if (
      files.some(function isTooLarge(file) {
        return file.size > MAX_IMAGE_SIZE
      })
    ) {
      setImageError('사진 한 장의 크기는 최대 10MB입니다.')
      return
    }
    if (files.length > MAX_IMAGES - images.length) {
      setImageError('사진은 최대 3장까지 등록할 수 있습니다.')
      return
    }

    try {
      const nextImages = await Promise.all(files.map(readImage))
      const updatedImages = [...images, ...nextImages].slice(0, MAX_IMAGES)
      setImages(updatedImages)
      setIsPhotoUploaded(updatedImages.length > 0)
      setImageError('')
    } catch {
      setImageError('사진을 읽을 수 없습니다. 다시 선택해주세요.')
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2>사진 등록</h2>
        <span>필수</span>
        <p>
          {images.length}/{MAX_IMAGES}
        </p>
      </div>
      {imageError && <p className={styles.helperText}>{imageError}</p>}

      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={rejectionReason !== null || isAnalyzing}
        onChange={handleImageChange}
      />
      <button
        className={styles.uploadArea}
        type="button"
        disabled={
          images.length === MAX_IMAGES ||
          isAnalyzing ||
          rejectionReason !== null
        }
        onClick={openFilePicker}
      >
        <span className={styles.cameraIcon}>
          <CameraIcon />
        </span>
        <strong>
          {images.length === MAX_IMAGES ? '사진 등록 완료' : '사진 업로드'}
        </strong>
        <small>
          {images.length === MAX_IMAGES
            ? '최대 3장의 사진을 등록했어요'
            : '클릭하여 이미지 선택'}
        </small>
      </button>

      <div className={styles.previewList}>
        {Array.from({ length: MAX_IMAGES }).map(
          function renderPreview(_, index) {
            const image = images[index]
            return image ? (
              <div
                className={styles.preview}
                key={image.id}
                style={{ backgroundImage: `url(${image.preview})` }}
              >
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={function handleRemoveImage() {
                    removeImage(image.id)
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                className={styles.emptyPreview}
                type="button"
                key={`empty-${index}`}
                disabled={isAnalyzing || rejectionReason !== null}
                onClick={openFilePicker}
              >
                <ImageIcon />
              </button>
            )
          },
        )}
      </div>
      <button
        className={styles.fillFromPhotoButton}
        type="button"
        disabled={!isPhotoUploaded || isAnalyzing || rejectionReason !== null}
        onClick={handleFillFromPhoto}
      >
        사진으로 내용 채우기
      </button>
      {isRejectionModalOpen && rejectionReason !== null && (
        <ModalDefault
          message={rejectionReason}
          onConfirm={function closeRejectionModal() {
            setIsRejectionModalOpen(false)
          }}
        />
      )}
    </section>
  )
}
