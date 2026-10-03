'use client'

import type { CSSProperties } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { ItemRegisterFormValues } from '../../../../../types/item'
import type { JoinedGroupOption } from '@/types/group'
import {
  CONDITION_MESSAGES,
  CONTENT_MAX_LENGTH,
  PACE_MESSAGES,
  TITLE_MAX_LENGTH,
  type RangeMessage,
} from '@/app/pages/items/register/constants/item'
import styles from './ItemInfoRegister.module.css'

function getRangeMessage(value: number, messages: readonly RangeMessage[]) {
  return messages.find((message) => value <= message.max) ?? messages.at(-1)!
}

type ItemInfoRegisterProps = {
  groups: JoinedGroupOption[]
}

export default function ItemInfoRegister({ groups }: ItemInfoRegisterProps) {
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
  const paceMessage = getRangeMessage(pace, PACE_MESSAGES)
  const conditionMessage = getRangeMessage(condition, CONDITION_MESSAGES)

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
              message: `제목은 ${TITLE_MAX_LENGTH}자 이내로 입력해주세요.`,
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
              message: `내용은 ${CONTENT_MAX_LENGTH.toLocaleString('ko-KR')}자 이내로 입력해주세요.`,
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
            <option value="UNAVAILABLE">거래 완료</option>
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
          min={1}
          max={99}
          onWheel={(event) => event.currentTarget.blur()}
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
            const selected = selectedGroups.includes(group.groupId)
            return (
              <button
                className={styles.groupRow}
                type="button"
                key={group.groupId}
                onClick={() => toggleGroup(group.groupId)}
              >
                <strong>{group.groupName}</strong>
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
            aria-label="교환 속도"
            aria-valuetext={paceMessage.title}
            style={{ '--range-progress': `${pace}%` } as CSSProperties}
            {...register('pace', { valueAsNumber: true })}
          />
          <div className={styles.rangeEnds}>
            <span>천천히</span>
            <span>급해요</span>
          </div>
          <div className={styles.rangeResult}>
            <strong>{paceMessage.title}</strong>
            <p>{paceMessage.description}</p>
          </div>
        </div>

        <div className={styles.rangeField}>
          <strong>가치가 좀 안 맞아도 괜찮나요?</strong>
          <input
            className={styles.range}
            type="range"
            min="0"
            max="100"
            aria-label="가치 허용도"
            aria-valuetext={conditionMessage.title}
            style={{ '--range-progress': `${condition}%` } as CSSProperties}
            {...register('condition', { valueAsNumber: true })}
          />
          <div className={styles.rangeEnds}>
            <span>깐깐하게</span>
            <span>너그럽게</span>
          </div>
          <div className={styles.rangeResult}>
            <strong>{conditionMessage.title}</strong>
            <p>{conditionMessage.description}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
