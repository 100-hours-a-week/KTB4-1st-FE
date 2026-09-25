'use client'

import type { CSSProperties } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { ItemRegisterFormValues } from '../../../../../types/item'
import styles from './ItemInfoRegister.module.css'

const TITLE_MAX_LENGTH = 100
const CONTENT_MAX_LENGTH = 2000

const groups = [
  { id: 1, name: '우리 동네 나눔방' },
  { id: 2, name: '직장 교환 모임' },
  { id: 3, name: '취미 용품 교환' },
]

export default function ItemInfoRegister() {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<ItemRegisterFormValues>()

  const title = useWatch({ control, name: 'title' })
  const content = useWatch({ control, name: 'content' })
  const pace = useWatch({ control, name: 'pace' })
  const condition = useWatch({ control, name: 'condition' })
  const selectedGroups = useWatch({ control, name: 'groupIds' })

  const toggleGroup = (id: number) => {
    setValue(
      'groupIds',
      selectedGroups.includes(id)
        ? selectedGroups.filter((groupId) => groupId !== id)
        : [...selectedGroups, id],
      { shouldDirty: true, shouldValidate: true },
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h2>입력 정보</h2>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldHeading}>
          <strong>제목</strong>
          <span>필수</span>
          <p>
            {title.length}/{TITLE_MAX_LENGTH}
          </p>
        </div>
        {errors.title && (
          <p className={styles.helperText}>{errors.title.message}</p>
        )}
        <input
          className={styles.textInput}
          placeholder="예: 게시글 제목"
          maxLength={TITLE_MAX_LENGTH}
          {...register('title', {
            required: '제목을 입력해주세요.',
            maxLength: {
              value: TITLE_MAX_LENGTH,
              message: '제목은 100자 이내로 입력해주세요.',
            },
          })}
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
        {errors.content && (
          <p className={styles.helperText}>{errors.content.message}</p>
        )}
        <textarea
          className={styles.textarea}
          placeholder="예: 게시글 내용"
          maxLength={CONTENT_MAX_LENGTH}
          {...register('content', {
            required: '내용을 입력해주세요.',
            maxLength: {
              value: CONTENT_MAX_LENGTH,
              message: '내용은 2,000자 이내로 입력해주세요.',
            },
          })}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldHeading}>
          <strong>거래 상태 설정</strong>
          <span>필수</span>
        </div>
        {errors.itemState && (
          <p className={styles.helperText}>{errors.itemState.message}</p>
        )}
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            {...register('itemState', {
              required: '거래 상태를 선택해주세요.',
            })}
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
        {errors.quantity && (
          <p className={styles.helperText}>{errors.quantity.message}</p>
        )}
        <input
          className={styles.textInput}
          type="number"
          placeholder="1 이상의 정수"
          {...register('quantity', {
            required: '수량을 입력해주세요.',
            min: { value: 1, message: '수량은 1개 이상이어야 합니다.' },
            max: { value: 99, message: '수량은 99개 이하여야 합니다.' },
            valueAsNumber: true,
            validate: (value) =>
              Number.isInteger(value) || '수량은 정수로 입력해주세요.',
          })}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldHeading}>
          <strong>등록할 그룹 선택</strong>
          <span>필수</span>
        </div>
        {errors.groupIds && (
          <p className={styles.helperText}>{errors.groupIds.message}</p>
        )}
        <input
          type="hidden"
          {...register('groupIds', {
            validate: (value) =>
              value.length > 0 || '최소 한 개의 그룹을 선택해주세요.',
          })}
        />
        <div className={styles.groupList}>
          {groups.map((group) => {
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
            style={{ '--range-progress': `${pace}%` } as CSSProperties}
            {...register('pace', { valueAsNumber: true })}
          />
          <div className={styles.rangeEnds}>
            <span>천천히</span>
            <span>급해요</span>
          </div>
          <div className={styles.rangeResult}>
            <strong>좋은 상대를 기다릴래요</strong>
            <p>조건이 맞는 사람이 나타날 때까지 여유롭게 기다려요.</p>
          </div>
        </div>

        <div className={styles.rangeField}>
          <strong>가치가 좀 안 맞아도 괜찮나요?</strong>
          <input
            className={styles.range}
            type="range"
            min="0"
            max="100"
            style={{ '--range-progress': `${condition}%` } as CSSProperties}
            {...register('condition', { valueAsNumber: true })}
          />
          <div className={styles.rangeEnds}>
            <span>깐깐하게</span>
            <span>너그럽게</span>
          </div>
          <div className={styles.rangeResult}>
            <strong>비슷하면 괜찮아요</strong>
            <p>엇비슷한 가치라면 교환할 의향이 있어요.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
