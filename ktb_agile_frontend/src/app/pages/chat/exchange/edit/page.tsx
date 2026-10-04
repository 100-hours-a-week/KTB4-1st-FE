'use client'

import { EXCHANGE_ERRORS } from '@/constants/errors/exchange'
import axios from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import ExchangeForm, {
  type ExchangeFormValues,
} from '@/components/exchange/ExchangeForm'
import { API_BASE_URL } from '@/config/api'
import styles from '../page.module.css'

type ExchangeRequestDetailsResponse = {
  data: {
    exchangeRequestId: number
    itemId: number
    requestedQuantity: number
    offeredItems: { itemId: number; quantity: number }[]
    requestedStatus: string
  } | null
  error: { code: string; message: string } | null
}

function ExchangeEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const exchangeRequestId = Number(searchParams.get('exchangeRequestId'))
  const itemId = Number(searchParams.get('itemId'))
  const requestedReturnTo = searchParams.get('returnTo')
  const returnTo =
    requestedReturnTo?.startsWith('/pages/chat/') &&
    !requestedReturnTo.startsWith('//')
      ? requestedReturnTo
      : '/pages/chat'
  const [initialValues, setInitialValues] = useState<ExchangeFormValues | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = window.sessionStorage.getItem('accessToken')
    if (!token) {
      router.replace('/auth/login')
      return
    }
    const controller = new AbortController()
    async function loadRequest() {
      try {
        if (
          !Number.isSafeInteger(exchangeRequestId) ||
          exchangeRequestId < 1 ||
          !Number.isSafeInteger(itemId) ||
          itemId < 1
        ) {
          throw new Error(EXCHANGE_ERRORS.REQUEST_INVALID)
        }
        const response = await axios.get<ExchangeRequestDetailsResponse>(
          `${API_BASE_URL}/exchange-requests/${exchangeRequestId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )
        const request = response.data.data
        if (!request || response.data.error)
          throw new Error(
            response.data.error?.message || EXCHANGE_ERRORS.REQUEST_LOAD_FAILED,
          )
        if (
          request.itemId !== itemId ||
          request.requestedStatus !== 'PENDING'
        ) {
          throw new Error(EXCHANGE_ERRORS.REQUEST_NOT_EDITABLE)
        }
        setInitialValues({
          requestedQuantity: request.requestedQuantity,
          offeredItems: request.offeredItems,
        })
      } catch (cause) {
        if (axios.isCancel(cause) || controller.signal.aborted) return
        setError(
          axios.isAxiosError<ExchangeRequestDetailsResponse>(cause)
            ? cause.response?.data?.error?.message ||
                EXCHANGE_ERRORS.REQUEST_LOAD_FAILED
            : cause instanceof Error
              ? cause.message
              : EXCHANGE_ERRORS.REQUEST_LOAD_FAILED,
        )
      }
    }
    void loadRequest()
    return () => controller.abort()
  }, [exchangeRequestId, itemId, router])

  async function updateExchangeRequest(
    values: ExchangeFormValues,
    accessToken: string,
  ) {
    await axios.put(
      `${API_BASE_URL}/exchange-requests/${exchangeRequestId}`,
      values,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    )
    router.push(returnTo)
  }

  if (error)
    return (
      <p className={styles.message} role="alert">
        {error}
      </p>
    )
  if (!initialValues)
    return <p className={styles.message}>교환 요청을 불러오는 중입니다.</p>

  return (
    <ExchangeForm
      itemId={itemId}
      includeGroupId
      initialValues={initialValues}
      closeHref={returnTo}
      submitLabel="수정하기"
      onSubmit={updateExchangeRequest}
    />
  )
}

export default function ExchangeEditPage() {
  return (
    <Suspense
      fallback={
        <p className={styles.message}>교환 요청을 불러오는 중입니다.</p>
      }
    >
      <ExchangeEditContent />
    </Suspense>
  )
}
