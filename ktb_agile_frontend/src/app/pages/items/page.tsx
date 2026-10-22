'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import Navbar from '@/components/common/navbar/Navbar'
import ChatbotButton from '@/components/common/chatbot/ChatbotButton'
import FloatingInquiryButton from '@/components/common/inquiry/FloatingInquiryButton'
import ItemCardList from '@/components/item/ItemCardList'
import Loading from '@/components/common/Loading'
import { useElasticPull } from '@/hooks/useElasticPull'
import type { ItemListItem, ItemListResponse } from '@/types/item'
import { getCurrentGroupId, setCurrentGroupId } from '@/utils/currentGroup'
import {
  clearItemListSession,
  readLastItemListSession,
  removeLegacySnapshots,
  saveItemListSession,
  type ItemListSnapshot,
} from '@/utils/itemListSession'
import styles from './page.module.css'

type JoinedGroup = {
  groupId: number
  groupName: string
}

type GroupListResponse = {
  data: {
    groups: JoinedGroup[]
  }
}

export default function ItemList() {
  const [joinedGroups, setJoinedGroups] = useState<JoinedGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [itemResult, setItemResult] = useState<{
    groupId: number
    items: ItemListItem[]
    nextCursor: string | null
    hasNext: boolean
    restoreScrollY?: number
  } | null>(null)
  const snapshotRef = useRef<ItemListSnapshot | null>(null)
  const leavingRef = useRef(false)
  const restoringRef = useRef(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const moreRequestRef = useRef<AbortController | null>(null)
  const refreshSignalRef = useRef<AbortSignal | null>(null)
  const [refreshError, setRefreshError] = useState(false)
  const [isGroupMenuOpen, setGroupMenuOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const selectedGroup =
    joinedGroups.find((group) => group.groupId === selectedGroupId) ?? null
  const items = itemResult?.groupId === selectedGroupId ? itemResult.items : []
  const isLoadingItems =
    selectedGroupId !== null && itemResult?.groupId !== selectedGroupId
  const refreshItems = useCallback(
    async (signal: AbortSignal) => {
      if (selectedGroupId === null || signal.aborted) return
      const accessToken = window.sessionStorage.getItem('accessToken')
      if (!accessToken) {
        router.replace('/auth/login')
        return
      }
      refreshSignalRef.current = signal
      moreRequestRef.current?.abort()
      moreRequestRef.current = null
      setIsLoadingMore(false)
      setLoadMoreError(false)
      setRefreshError(false)
      try {
        const response = await axios.get<ItemListResponse>(
          `${API_BASE_URL}/groups/${selectedGroupId}/items`,
          {
            params: { size: 10, cursor: '' },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            signal,
          },
        )
        if (signal.aborted) return
        // 기존 페이지와 커서를 새 첫 페이지로 교체합니다.
        setItemResult({ groupId: selectedGroupId, ...response.data.data })
      } catch (error) {
        if (!signal.aborted) {
          console.error(error)
          setRefreshError(true)
        }
      } finally {
        if (refreshSignalRef.current === signal) refreshSignalRef.current = null
      }
    },
    [selectedGroupId, router],
  )
  const {
    contentRef: pullContentRef,
    pullProgress,
    isRefreshing,
  } = useElasticPull(
    !isLoadingGroups &&
      !isLoadingItems &&
      !isGroupMenuOpen &&
      selectedGroupId !== null,
    refreshItems,
  )
  const searchHref = `/pages/search?${new URLSearchParams({
    groups: JSON.stringify(joinedGroups),
    ...(selectedGroupId === null ? {} : { groupId: String(selectedGroupId) }),
  })}`

  useLayoutEffect(() => {
    if (!itemResult || itemResult.groupId !== selectedGroupId) {
      restoringRef.current = true
      return
    }
    restoringRef.current = itemResult.restoreScrollY !== undefined
    snapshotRef.current = {
      groupId: itemResult.groupId,
      items: itemResult.items,
      nextCursor: itemResult.nextCursor,
      hasNext: itemResult.hasNext,
      scrollY: itemResult.restoreScrollY ?? window.scrollY,
    }
  }, [itemResult, selectedGroupId])

  const saveCurrentList = useCallback(() => {
    const snapshot = snapshotRef.current
    if (!snapshot) return
    if (!restoringRef.current && !leavingRef.current)
      snapshot.scrollY = window.scrollY
    saveItemListSession(snapshot)
  }, [])

  useEffect(() => {
    leavingRef.current = false
    const trackScroll = () => {
      if (snapshotRef.current && !restoringRef.current && !leavingRef.current) {
        snapshotRef.current.scrollY = window.scrollY
      }
    }
    const saveOnLeave = () => {
      if (snapshotRef.current) saveItemListSession(snapshotRef.current)
    }
    const resume = () => {
      leavingRef.current = false
    }
    window.addEventListener('scroll', trackScroll, { passive: true })
    window.addEventListener('pagehide', saveOnLeave)
    window.addEventListener('pageshow', resume)
    return () => {
      saveOnLeave()
      window.removeEventListener('scroll', trackScroll)
      window.removeEventListener('pagehide', saveOnLeave)
      window.removeEventListener('pageshow', resume)
    }
  }, [])

  const handleNavigate = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      link.target === '_blank' ||
      link.hasAttribute('download') ||
      new URL(link.href).pathname === window.location.pathname
    )
      return
    saveCurrentList()
    leavingRef.current = true
  }

  useEffect(() => {
    removeLegacySnapshots()
    const currentGroupId = getCurrentGroupId()
    const lastSnapshot = readLastItemListSession()
    const requestedGroupId = Number(
      new URLSearchParams(window.location.search).get('groupId'),
    )
    const controller = new AbortController()

    async function fetchJoinedGroups() {
      try {
        const response = await axios.get<GroupListResponse>('/bff/me/groups', {
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })
        const groups = response.data.data.groups.map(
          ({ groupId, groupName }) => ({
            groupId,
            groupName,
          }),
        )

        if (controller.signal.aborted) return
        setJoinedGroups(groups)
        setSelectedGroupId(
          groups.find((group) => group.groupId === requestedGroupId)?.groupId ??
            groups.find((group) => group.groupId === lastSnapshot?.groupId)
              ?.groupId ??
            groups.find((group) => group.groupId === currentGroupId)?.groupId ??
            groups[0]?.groupId ??
            null,
        )
        if (groups.length === 0) setCurrentGroupId(0)
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error(error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingGroups(false)
        }
      }
    }

    fetchJoinedGroups()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedGroupId === null) return

    const groupId = selectedGroupId
    let isActive = true
    const accessToken = window.sessionStorage.getItem('accessToken')

    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    setCurrentGroupId(groupId)
    const url = new URL(window.location.href)
    if (url.searchParams.get('groupId') !== String(groupId)) {
      url.searchParams.set('groupId', String(groupId))
      router.replace(`${url.pathname}${url.search}${url.hash}`, {
        scroll: false,
      })
    }

    async function fetchItems() {
      try {
        const snapshot = readLastItemListSession()
        if (snapshot?.groupId === groupId) {
          if (isActive) {
            setItemResult({
              ...snapshot,
              restoreScrollY: snapshot.scrollY,
            })
            setIsLoadingMore(false)
            setLoadMoreError(false)
          }
          return
        }
        if (snapshot) {
          clearItemListSession()
          snapshotRef.current = null
          window.scrollTo({ top: 0, behavior: 'instant' })
        }
        const response = await axios.get<ItemListResponse>(
          `${API_BASE_URL}/groups/${groupId}/items?size=10&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        if (isActive) {
          setItemResult({ groupId, ...response.data.data })
          setIsLoadingMore(false)
          setLoadMoreError(false)
        }
      } catch (error) {
        if (isActive) console.error(error)
      }
    }

    // 저장된 목록도 첫 조회와 같은 비동기 흐름으로 반영합니다.
    queueMicrotask(() => {
      if (isActive) void fetchItems()
    })

    return () => {
      isActive = false
      moreRequestRef.current?.abort()
      moreRequestRef.current = null
    }
  }, [selectedGroupId, router])

  const loadMore = useCallback(async () => {
    if (
      !itemResult ||
      itemResult.groupId !== selectedGroupId ||
      !itemResult.hasNext ||
      !itemResult.nextCursor ||
      itemResult.restoreScrollY !== undefined ||
      moreRequestRef.current ||
      refreshSignalRef.current
    )
      return

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    const controller = new AbortController()
    moreRequestRef.current = controller
    setIsLoadingMore(true)
    setLoadMoreError(false)
    try {
      const response = await axios.get<ItemListResponse>(
        `${API_BASE_URL}/groups/${itemResult.groupId}/items`,
        {
          params: { cursor: itemResult.nextCursor },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      )
      if (controller.signal.aborted) return
      const page = response.data.data
      setItemResult((current) =>
        current === itemResult
          ? {
              groupId: current.groupId,
              items: [...current.items, ...page.items],
              nextCursor: page.nextCursor,
              hasNext: page.hasNext,
            }
          : current,
      )
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error)
        setLoadMoreError(true)
      }
    } finally {
      if (moreRequestRef.current === controller) {
        moreRequestRef.current = null
        setIsLoadingMore(false)
      }
    }
  }, [itemResult, selectedGroupId, router])

  const restoreListPosition = useCallback(() => {
    if (
      !itemResult ||
      itemResult.groupId !== selectedGroupId ||
      itemResult.restoreScrollY === undefined
    )
      return
    const scrollY = itemResult.restoreScrollY
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'instant' })
      setItemResult((current) =>
        current === itemResult
          ? { ...current, restoreScrollY: undefined }
          : current,
      )
    })
    return () => cancelAnimationFrame(frame)
  }, [itemResult, selectedGroupId])

  useEffect(() => {
    if (!isGroupMenuOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setGroupMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [isGroupMenuOpen])

  return (
    <section className={styles.page} onClickCapture={handleNavigate}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {isLoadingGroups ? null : selectedGroup ? (
            <div className={styles.groupDropdown} ref={dropdownRef}>
              <button
                className={styles.groupTrigger}
                type="button"
                onClick={() => setGroupMenuOpen((open) => !open)}
              >
                <span className={styles.groupName}>
                  {selectedGroup.groupName}
                </span>
              </button>
              {isGroupMenuOpen && (
                <div className={styles.groupMenu}>
                  <ul className={styles.groupList}>
                    {joinedGroups.map((group) => (
                      <li key={group.groupId}>
                        <button
                          className={`${styles.groupOption} ${
                            group.groupId === selectedGroup.groupId
                              ? styles.selected
                              : ''
                          }`}
                          type="button"
                          onClick={() => {
                            if (group.groupId !== selectedGroupId) {
                              clearItemListSession()
                              snapshotRef.current = null
                              restoringRef.current = true
                              window.scrollTo({ top: 0, behavior: 'instant' })
                              setSelectedGroupId(group.groupId)
                            }
                            setGroupMenuOpen(false)
                          }}
                        >
                          {group.groupName}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <Link className={styles.groupPageLink} href="/pages/groups">
                    그룹 페이지로 이동 &gt;
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Link className={styles.joinLink} href="/pages/groups">
              그룹 가입
            </Link>
          )}
          <Link className={styles.searchLink} href={searchHref}>
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </Link>
        </div>
      </header>
      <div ref={pullContentRef} className={styles.pullContent}>
        {(pullProgress > 0 || isRefreshing) && (
          <div className={styles.pullIndicator}>
            <Loading progress={isRefreshing ? undefined : pullProgress} />
          </div>
        )}
        {refreshError && (
          <p role="alert" className={styles.refreshError}>
            새로고침하지 못했습니다. 다시 당겨서 시도해주세요.
          </p>
        )}
        {isLoadingGroups ||
        isLoadingItems ||
        (selectedGroup &&
          (items.length > 0 || itemResult?.restoreScrollY !== undefined)) ? (
          <ItemCardList
            key={selectedGroupId}
            className={styles.itemList}
            isLoading={isLoadingGroups || isLoadingItems}
            items={items}
            onLoadMore={
              !isRefreshing &&
              itemResult?.hasNext &&
              itemResult.restoreScrollY === undefined
                ? loadMore
                : undefined
            }
            onReady={restoreListPosition}
          />
        ) : (
          <div className={styles.emptyState}>
            <h1 className={styles.emptyTitle}>
              {selectedGroup
                ? '등록된 물건이 없습니다.'
                : '그룹에 가입하지 않았습니다.'}
            </h1>
            <p className={styles.emptyDescription}>
              {selectedGroup
                ? `${selectedGroup.groupName}에 첫 물건을 등록해보세요.`
                : '그룹에 가입해서 물품들을 구경해보아요.'}
            </p>
          </div>
        )}
        {!isLoadingItems && isLoadingMore && (
          <p role="status">물품을 더 불러오는 중...</p>
        )}
        {!isLoadingItems && loadMoreError && (
          <button type="button" onClick={loadMore}>
            다시 불러오기
          </button>
        )}
      </div>
      <Navbar />
      <FloatingInquiryButton />
      <ChatbotButton />
    </section>
  )
}
