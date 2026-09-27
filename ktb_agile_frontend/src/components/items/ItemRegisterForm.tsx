'use client'

import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import ImageRegister from '@/app/pages/items/register/components/ImageRegister'
import ItemInfoRegister from '@/app/pages/items/register/components/ItemInfoRegister'
import type { ItemRegisterFormValues, SelectedImage } from '@/types/item'
import styles from './ItemRegisterForm.module.css'

export type ItemRegisterSubmitContext = {
  images: SelectedImage[]
  setImages: Dispatch<SetStateAction<SelectedImage[]>>
}

type ItemRegisterFormProps = {
  initialValues?: Partial<ItemRegisterFormValues>
  initialImages?: SelectedImage[]
  isSubmitting: boolean
  requireChanges?: boolean
  submitLabel?: string
  submittingLabel?: string
  onSubmit: (
    values: ItemRegisterFormValues,
    context: ItemRegisterSubmitContext,
  ) => void | Promise<void>
  onValidationError: (message: string) => void
}

const DEFAULT_VALUES: ItemRegisterFormValues = {
  title: '',
  content: '',
  itemState: 'AVAILABLE',
  quantity: undefined,
  groupIds: [1],
  pace: 55,
  condition: 28,
}

export default function ItemRegisterForm({
  initialValues,
  initialImages = [],
  isSubmitting,
  requireChanges = false,
  submitLabel = '등록 완료',
  submittingLabel = '등록 중...',
  onSubmit,
  onValidationError,
}: ItemRegisterFormProps) {
  const [images, setImages] = useState<SelectedImage[]>(initialImages)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isImageRejected, setIsImageRejected] = useState(false)

  const methods = useForm<ItemRegisterFormValues>({
    mode: 'onChange',
    defaultValues: {
      ...DEFAULT_VALUES,
      ...initialValues,
    },
  })

  const { isValid, isDirty, isValidating } = methods.formState
  const { trigger } = methods

  useEffect(() => {
    void trigger()
  }, [trigger])

  const imagesChanged =
    images.length !== initialImages.length ||
    images.some((image, index) => image.id !== initialImages[index]?.id)
  const hasChanges = isDirty || imagesChanged
  const canSubmit =
    isValid &&
    !isValidating &&
    images.length > 0 &&
    !isSubmitting &&
    !isAnalyzing &&
    !isImageRejected &&
    (!requireChanges || hasChanges)

  async function handleSubmit(values: ItemRegisterFormValues) {
    if (isSubmitting || isAnalyzing || isImageRejected) return
    if (requireChanges && !hasChanges) return
    if (images.length === 0 || values.quantity === undefined) {
      onValidationError('사진과 필수 정보를 입력해주세요.')
      return
    }

    await onSubmit(values, { images, setImages })
  }

  return (
    <FormProvider {...methods}>
      <form
        className={styles.form}
        onSubmit={methods.handleSubmit(handleSubmit)}
      >
        <ImageRegister
          images={images}
          setImages={setImages}
          isSubmitting={isSubmitting}
          onAnalysisStateChange={setIsAnalyzing}
          onRejectionChange={setIsImageRejected}
        />
        <ItemInfoRegister />

        <div className={styles.submitBar}>
          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
