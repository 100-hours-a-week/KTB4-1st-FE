'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { SelectedImage } from '../../../../../types/item'
import styles from './ImageRegister.module.css'

const MAX_IMAGES = 3

type ImageRegisterProps = {
  images: SelectedImage[]
  setImages: Dispatch<SetStateAction<SelectedImage[]>>
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({ id: crypto.randomUUID(), file, preview: String(reader.result) })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ImageRegister({
  images,
  setImages,
}: ImageRegisterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState('')

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setImageError('이미지 파일만 선택할 수 있습니다.')
      return
    }
    if (files.length > MAX_IMAGES - images.length) {
      setImageError('사진은 최대 3장까지 등록할 수 있습니다.')
      return
    }

    try {
      const nextImages = await Promise.all(files.map(readImage))
      setImages((current) => [...current, ...nextImages].slice(0, MAX_IMAGES))
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
        accept="image/*"
        multiple
        onChange={handleImageChange}/>
      <button
        className={styles.uploadArea}
        type="button"
        disabled={images.length === MAX_IMAGES}
        onClick={() => fileInputRef.current?.click()}>
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
        {Array.from({ length: MAX_IMAGES }).map((_, index) => {
          const image = images[index]
          return image ? (
            <div
              className={styles.preview}
              key={image.id}
              style={{ backgroundImage: `url(${image.preview})` }}
            >
              <button
                type="button"
                onClick={() =>
                  setImages((current) =>
                    current.filter((item) => item.id !== image.id),
                  )
                }
              >
                ×
              </button>
            </div>
          ) : (
            <button
              className={styles.emptyPreview}
              type="button"
              key={`empty-${index}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon />
            </button>
          )
        })}
      </div>
      <button className={styles.fillFromPhotoButton} type="button" disabled>
        사진으로 내용 채우기
      </button>
    </section>
  )
}
