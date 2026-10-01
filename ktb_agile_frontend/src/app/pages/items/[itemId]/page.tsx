'use client'

import axios from 'axios'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import { API_BASE_URL } from '@/config/api'
import type { ItemDetail, ItemDetailResponse } from '@/types/item'
import { getUserIdFromAccessToken } from '@/utils/auth'
import { formatRelativeTime, getItemStateLabel } from '@/utils/item'
import styles from './page.module.css'

const DEFAULT_ERROR_MESSAGE =
  '물품 정보를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.'

export default function ItemDetailsPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const router = useRouter()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
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

    const loadItemDetails = async () => {
      try {
        const response = await axios.get<ItemDetailResponse>(
          `${API_BASE_URL}/items/${itemId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )
        const itemDetails = response.data.data

        if (isMounted) {
          setItem(itemDetails)
          setIsOwner(
            itemDetails.owner.userId === getUserIdFromAccessToken(accessToken),
          )
        }
      } catch (error) {
        if (!isMounted) return

        setErrorMessage(
          axios.isAxiosError(error) && error.response?.status === 404
            ? '물품을 찾을 수 없습니다.'
            : DEFAULT_ERROR_MESSAGE,
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

  async function handleDeleteItem() {
    if (!item || isDeleting) return

    const accessToken = sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    setIsDeleting(true)

    try {
      await axios.delete(`${API_BASE_URL}/items/${item.itemId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      setIsDeleteModalOpen(false)
      router.replace('/pages/items')
    } catch (error) {
      setIsDeleteModalOpen(false)

      setErrorMessage(
        axios.isAxiosError(error) && error.response?.status === 404
          ? '삭제할 물품을 찾을 수 없습니다.'
          : '물품 삭제에 실패했습니다. 다시 시도해주세요.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

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
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() =>
                      router.push(`/pages/items/${item.itemId}/edit`)
                    }
                  >
                    수정하기
                  </button>
                  <button
                    className={styles.deleteButton}
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    삭제하기
                  </button>
                </>
              ) : (
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={item.itemState === 'UNAVAILABLE'}
                  onClick={() =>
                    router.push(`/pages/chat/exchange?itemId=${item.itemId}`)
                  }
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
      {isDeleteModalOpen && !errorMessage && (
        <ModalDefault
          message="물품을 삭제하시겠습니까?"
          confirmLabel={isDeleting ? '삭제 중...' : '삭제하기'}
          cancelLabel="취소"
          onConfirm={handleDeleteItem}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </>
  )
}
