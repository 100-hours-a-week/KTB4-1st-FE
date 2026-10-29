'use client'

import { ITEM_ERRORS } from '@/constants/errors/item'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { itemListKeys } from '@/queries/itemList'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ModalDefault from '@/components/common/modal/Default'
import LikeButton from '@/components/item/like/LikeButton'
import ItemDetailImageContainer from '@/components/item/ItemDetailImageContainer'
import { API_BASE_URL } from '@/config/api'
import type { ItemDetail, ItemDetailResponse } from '@/types/item'
import {
  getUserIdFromAccessToken,
  getAccessTokenOrRedirect,
} from '@/utils/auth'
import { getItemStateLabel } from '@/utils/item'
import { formatLastTime } from '@/utils/date'
import styles from './page.module.css'

export default function ItemDetailsPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const accessToken = getAccessTokenOrRedirect(router)

    if (!accessToken) {
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
            ? ITEM_ERRORS.NOT_FOUND
            : ITEM_ERRORS.DETAIL_LOAD_FAILED,
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

  const groupNames = item?.groups.map((group) => group.groupName).join(', ')

  async function handleDeleteItem() {
    if (!item || isDeleting) return

    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    setIsDeleting(true)

    try {
      await axios.delete(`${API_BASE_URL}/items/${item.itemId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })

      void queryClient.invalidateQueries({ queryKey: itemListKeys.all })
      setIsDeleteModalOpen(false)
      router.replace('/pages/items')
    } catch (error) {
      setIsDeleteModalOpen(false)

      setErrorMessage(
        axios.isAxiosError(error) && error.response?.status === 404
          ? ITEM_ERRORS.DELETE_NOT_FOUND
          : ITEM_ERRORS.DELETE_FAILED,
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className={styles.page}>
        <ItemDetailImageContainer
          images={item?.images}
          title={item?.title}
          isLoading={isLoading}
          onBack={() => router.back()}
        />

        {item ? (
          <main className={styles.content}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{item.title}</h1>
              <LikeButton
                itemId={item.itemId}
                isLiked={item.isLiked}
                initialLikeCount={item.likeCount}
                placement="title"
              />
            </div>
            <p className={styles.meta}>
              등록자: {item.owner.nickname} · 그룹: {groupNames || '없음'} ·{' '}
              {formatLastTime(item.createdAt)}
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
