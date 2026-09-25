'use client'

import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import ImageRegister from './components/ImageRegister'
import ItemInfoRegister from './components/ItemInfoRegister'
import type {
  ItemRegisterFormValues,
  SelectedImage,
} from '../../../../types/item'
import styles from './page.module.css'

export default function ItemRegister() {
  const [images, setImages] = useState<SelectedImage[]>([])

  const methods = useForm<ItemRegisterFormValues>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      content: '',
      itemState: 'AVAILABLE',
      quantity: undefined,
      groupIds: [1],
      pace: 55,
      condition: 28,
    },
  })

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} type="button">
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1>물건 등록</h1>
      </header>

      <FormProvider {...methods}>
        <form
          className={styles.form}
          onSubmit={methods.handleSubmit(() => undefined)}
        >
          <ImageRegister images={images} setImages={setImages} />
          <ItemInfoRegister />

          <div className={styles.submitBar}>
            <button
              type="submit"
              disabled={!methods.formState.isValid || images.length === 0}
            >
              등록 완료
            </button>
          </div>
        </form>
      </FormProvider>
    </section>
  )
}
