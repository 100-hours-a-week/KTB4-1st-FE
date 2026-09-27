'use client'

import axios from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ExchangeForm, {
  type ExchangeFormValues,
} from '@/components/exchange/ExchangeForm'
import { API_BASE_URL } from '@/config/api'
import styles from './page.module.css'

function ExchangePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const itemId = Number(searchParams.get('itemId'))

  async function sendExchangeRequest(
    values: ExchangeFormValues,
    accessToken: string,
  ) {
    await axios.post(
      `${API_BASE_URL}/items/${itemId}/exchange-requests`,
      values,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    )
    router.push('/pages/chat')
  }

  return (
    <ExchangeForm
      itemId={itemId}
      submitLabel="요청하기"
      onSubmit={sendExchangeRequest}
    />
  )
}

export default function ExchangePage() {
  return (
    <Suspense
      fallback={
        <p className={styles.message}>물품 정보를 불러오는 중입니다.</p>
      }
    >
      <ExchangePageContent />
    </Suspense>
  )
}
