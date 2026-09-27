'use client'

// import axios from 'axios'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import { getMockItemDetail } from '@/data/mockItems'
import type { ItemDetail } from '@/types/item'
// import type { ItemDetailResponse } from '@/types/item'
import { formatRelativeTime, getItemStateLabel } from '@/utils/item'
import styles from './page.module.css'

// const API_BASE_URL = 'http://127.0.0.1:8080'
const DEFAULT_ERROR_MESSAGE =
  '물품 정보를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.'

function getUserIdFromAccessToken(accessToken: string) {
  try {
    const payloadPart = accessToken.split('.')[1]
    if (!payloadPart) return null

    const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    )
    const payload = JSON.parse(window.atob(paddedPayload)) as {
      sub?: string
    }
    const userId = Number(payload.sub)

    return Number.isInteger(userId) && userId > 0 ? userId : null
  } catch {
    return null
  }
}

export default function ItemDetailsPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const router = useRouter()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const accessToken = sessionStorage.getItem('accessToken')

    if (!accessToken) {
      router.replace('/auth/login')
      return () => {
        isMounted = false
      }
    }

    const loadItemDetails = () => {
      try {
        // 실제 API 연결 시 아래 호출을 사용하면 됩니다.
        // const response = await axios.get<ItemDetailResponse>(
        //   `${API_BASE_URL}/items/${itemId}`,
        //   {
        //     headers: {
        //       Authorization: `Bearer ${accessToken}`,
        //       Accept: 'application/json',
        //     },
        //   },
        // )
        // const itemDetails = response.data.data

        const response = getMockItemDetail(Number(itemId))

        if (!response) {
          throw new Error('물품을 찾을 수 없습니다.')
        }

        const itemDetails = response.data

        if (isMounted) {
          setItem(itemDetails)
          setIsOwner(
            itemDetails.owner.userId === getUserIdFromAccessToken(accessToken),
          )
        }
      } catch (error) {
        if (!isMounted) return

        setErrorMessage(
          error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadItemDetails()

    return () => {
      isMounted = false
    }
  }, [itemId, router])

  const primaryImage = useMemo(
    () =>
      item?.images.toSorted(
        (first, second) => first.displayOrder - second.displayOrder,
      )[0],
    [item],
  )
  const groupNames = item?.groups.map((group) => group.groupName).join(', ')

  return (
    <>
      <div className={styles.page}>
        <div
          className={styles.imageArea}
          style={
            primaryImage
              ? {
                  backgroundImage: `url("${primaryImage.imageUrl.replaceAll('"', '%22')}")`,
                }
              : undefined
          }
        >
          <Link className={styles.backButton} href="/pages/items">
            ‹
          </Link>
          {!primaryImage && !isLoading && (
            <svg className={styles.placeholderIcon} viewBox="0 0 24 24">
              <rect x="3.5" y="4" width="17" height="16" rx="2" />
              <circle cx="9" cy="9.5" r="1.5" />
              <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
            </svg>
          )}
        </div>

        {item ? (
          <main className={styles.content}>
            <h1 className={styles.title}>{item.title}</h1>
            <p className={styles.meta}>
              등록자: {item.owner.nickname} · 그룹: {groupNames || '없음'} ·{' '}
              {formatRelativeTime(item.createdAt)}
            </p>

            <section className={styles.informationCard}>
              <h2>상품 설명</h2>
              <p>{item.content}</p>
            </section>

            <section className={styles.informationCard}>
              <h2>상세 정보</h2>
              <dl className={styles.details}>
                <div>
                  <dt>잔여 수량</dt>
                  <dd>{item.quantity}개</dd>
                </div>
                <div>
                  <dt>등록 상태</dt>
                  <dd>{getItemStateLabel(item.itemState)}</dd>
                </div>
              </dl>
            </section>

            <div className={styles.actions}>
              {isOwner ? (
                <>
                  <button className={styles.primaryButton} type="button">
                    수정하기
                  </button>
                  <button className={styles.deleteButton} type="button">
                    삭제하기
                  </button>
                </>
              ) : (
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={item.itemState === 'UNAVAILABLE'}
                >
                  {item.itemState === 'UNAVAILABLE' ? '거래 완료' : '제안하기'}
                </button>
              )}
            </div>
          </main>
        ) : (
          <p className={styles.loadingMessage}>
            {isLoading ? '물품 정보를 불러오는 중입니다.' : ''}
          </p>
        )}
      </div>

      {errorMessage && (
        <ModalDefault
          message={errorMessage}
          onConfirm={() => setErrorMessage(null)}
        />
      )}
    </>
  )
}
