'use client'

import { useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

const MAX_IMAGES = 3
const TITLE_MAX_LENGTH = 100
const CONTENT_MAX_LENGTH = 2000

type UploadedImage = {
  file: File
  id: string
  preview: string
}

const GROUPS = [
  { id: 'neighborhood', name: '우리 동네 나눔방' },
  { id: 'workplace', name: '직장 교환 모임' },
  { id: 'hobby', name: '취미 용품 교환' },
]

function readImage(file: File, index: number): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        file,
        id: `${file.name}-${file.lastModified}-${index}-${Date.now()}`,
        preview: String(reader.result),
      })
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

export default function ItemRegister() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [itemState, setItemState] = useState('AVAILABLE')
  const [quantity, setQuantity] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    'neighborhood',
  ])
  const [pace, setPace] = useState(55)
  const [condition, setCondition] = useState(28)

  const isComplete =
    images.length > 0 &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    quantity.length > 0 &&
    Number(quantity) > 0 &&
    selectedGroups.length > 0

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const availableCount = MAX_IMAGES - images.length
    const files = Array.from(event.target.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, availableCount)

    if (files.length > 0) {
      const uploadedImages = await Promise.all(files.map(readImage))
      setImages((current) =>
        [...current, ...uploadedImages].slice(0, MAX_IMAGES),
      )
    }

    event.target.value = ''
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups((current) =>
      current.includes(id)
        ? current.filter((groupId) => groupId !== id)
        : [...current, id],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isComplete) return
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          type="button"
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1>물건 등록</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>사진 등록</h2>
            <span>필수</span>
            <p>
              {images.length}/{MAX_IMAGES}
            </p>
          </div>

          <input
            ref={fileInputRef}
            className={styles.fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <button
            className={styles.uploadArea}
            type="button"
            disabled={images.length === MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
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
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2>입력 정보</h2>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeading}>
              <strong>제목</strong>
              <span>필수</span>
            </div>
            <input
              className={styles.textInput}
              type="text"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="예: 게시글 제목"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeading}>
              <strong>내용</strong>
              <span>필수</span>
              <p>
                {content.length}/{CONTENT_MAX_LENGTH}
              </p>
            </div>
            <textarea
              className={styles.textarea}
              value={content}
              maxLength={CONTENT_MAX_LENGTH}
              placeholder="예: 게시글 내용"
              onChange={(event) => setContent(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeading}>
              <strong>거래 상태 설정</strong>
              <span>필수</span>
            </div>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={itemState}
                onChange={(event) => setItemState(event.target.value)}
              >
                <option value="AVAILABLE">거래 가능</option>
                <option value="COMPLETED">거래 완료</option>
              </select>
              <svg viewBox="0 0 20 20">
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeading}>
              <strong>수량</strong>
              <span>필수</span>
              <p>최대 99개</p>
            </div>
            <input
              className={styles.textInput}
              type="number"
              inputMode="numeric"
              min="1"
              max="99"
              value={quantity}
              placeholder="1 이상의 정수"
              onChange={(event) => {
                const nextValue = event.target.value
                if (nextValue === '' || Number(nextValue) <= 99)
                  setQuantity(nextValue)
              }}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldHeading}>
              <strong>등록할 그룹 선택</strong>
              <span>필수</span>
            </div>
            <div className={styles.groupList}>
              {GROUPS.map((group) => {
                const selected = selectedGroups.includes(group.id)
                return (
                  <button
                    className={styles.groupRow}
                    type="button"
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <strong>{group.name}</strong>
                    <span
                      className={`${styles.switch} ${selected ? styles.switchOn : ''}`}
                    >
                      <i />
                    </span>
                  </button>
                )
              })}
            </div>
            <p className={styles.hint}>최소 1개 이상 선택해야 합니다</p>
          </div>

          <div className={styles.preferenceSection}>
            <div className={styles.preferenceHeading}>
              <h3>거래 옵션</h3>
              <p>선호하는 거래 방식을 알려주세요.</p>
            </div>

            <div className={styles.rangeField}>
              <strong>얼마나 빨리 교환하고 싶나요?</strong>
              <input
                className={styles.range}
                type="range"
                min="0"
                max="100"
                value={pace}
                style={{ '--range-progress': `${pace}%` } as CSSProperties}
                onChange={(event) => setPace(Number(event.target.value))}
              />
              <div className={styles.rangeEnds}>
                <span>천천히</span>
                <span>급해요</span>
              </div>
              <div className={styles.rangeResult}>
                <strong>
                  {pace < 34
                    ? '천천히 알아봐도 괜찮아요'
                    : pace < 67
                      ? '좋은 상대를 기다릴래요'
                      : '빠른 교환을 원해요'}
                </strong>
                <p>
                  {pace < 34
                    ? '여유롭게 마음에 드는 교환을 찾아보세요.'
                    : pace < 67
                      ? '조건이 맞는 사람이 나타날 때까지 여유롭게 기다려요.'
                      : '조건이 맞으면 빠르게 약속을 잡아보세요.'}
                </p>
              </div>
            </div>

            <div className={styles.rangeField}>
              <strong>가치가 좀 안 맞아도 괜찮나요?</strong>
              <input
                className={styles.range}
                type="range"
                min="0"
                max="100"
                value={condition}
                style={{ '--range-progress': `${condition}%` } as CSSProperties}
                onChange={(event) => setCondition(Number(event.target.value))}
              />
              <div className={styles.rangeEnds}>
                <span>깐깐하게</span>
                <span>너그럽게</span>
              </div>
              <div className={styles.rangeResult}>
                <strong>
                  {condition < 34
                    ? '비슷하면 괜찮아요'
                    : condition < 67
                      ? '조금 달라도 좋아요'
                      : '마음에 들면 충분해요'}
                </strong>
                <p>
                  {condition < 34
                    ? '엇비슷한 가치라면 교환할 의향이 있어요.'
                    : condition < 67
                      ? '가치 차이가 조금 있어도 살펴볼게요.'
                      : '가치보다는 물건과 사람을 더 중요하게 생각해요.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.submitBar}>
          <button type="submit" disabled={!isComplete}>
            등록 완료
          </button>
        </div>
      </form>
    </section>
  )
}
