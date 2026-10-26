'use client'

import HalloweenDecoration from '@/components/common/seasonal/HalloweenDecoration'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import axios from 'axios'
import Navbar from '@/components/common/navbar/Navbar'
import ChatbotButton from '@/components/common/chatbot/ChatbotButton'
import FloatingInquiryButton from '@/components/common/inquiry/FloatingInquiryButton'
import ItemCardList from '@/components/item/ItemCardList'
import Loading from '@/components/common/Loading'
import { useElasticPull } from '@/hooks/useElasticPull'
import { useQueryClient } from '@tanstack/react-query'
import { itemListKeys, useItemList } from '@/queries/itemList'
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
  const queryClient = useQueryClient()
  const snapshotRef = useRef<ItemListSnapshot | null>(null)
  const leavingRef = useRef(false)
  const restoringRef = useRef(true)
  const [refreshError, setRefreshError] = useState(false)
  const [isGroupMenuOpen, setGroupMenuOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const selectedGroup =
    joinedGroups.find((group) => group.groupId === selectedGroupId) ?? null
  const {
    data,
    queryKey,
    isPending,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    isError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useItemList(selectedGroupId, router)
  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )
  const isLoadingItems = selectedGroupId !== null && isPending
  const refreshItems = useCallback(
    async (signal: AbortSignal) => {
      if (selectedGroupId === null || signal.aborted) return
      setRefreshError(false)
      const cancel = () => {
        void queryClient.cancelQueries({ queryKey, exact: true })
      }
      signal.addEventListener('abort', cancel, { once: true })
      try {
        const result = await refetch()
        if (!signal.aborted) setRefreshError(result.isError)
      } finally {
        signal.removeEventListener('abort', cancel)
      }
    },
    [selectedGroupId, queryClient, queryKey, refetch],
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

  const initialPosition = useMemo(() => {
    const saved = readLastItemListSession()
    const cached = queryClient.getQueryData(queryKey)
    return {
      groupId: selectedGroupId,
      scrollY: cached && saved?.groupId === selectedGroupId ? saved.scrollY : 0,
      discardSaved: Boolean(
        saved && (!cached || saved.groupId !== selectedGroupId),
      ),
    }
  }, [selectedGroupId, queryClient, queryKey])
  const [restoredPosition, setRestoredPosition] = useState<
    typeof initialPosition | null
  >(null)
  const restoreScrollY =
    restoredPosition === initialPosition ? null : initialPosition.scrollY

  useLayoutEffect(() => {
    if (initialPosition.groupId === null) return
    if (initialPosition.discardSaved) clearItemListSession()
    snapshotRef.current = {
      groupId: initialPosition.groupId,
      scrollY: initialPosition.scrollY,
    }
    restoringRef.current = true
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [initialPosition])

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
    setCurrentGroupId(groupId)
    const url = new URL(window.location.href)
    if (url.searchParams.get('groupId') !== String(groupId)) {
      url.searchParams.set('groupId', String(groupId))
      router.replace(`${url.pathname}${url.search}${url.hash}`, {
        scroll: false,
      })
    }
  }, [selectedGroupId, router])

  const loadMore = useCallback(() => {
    if (
      restoringRef.current ||
      !hasNextPage ||
      queryClient.isFetching({ queryKey, exact: true })
    )
      return
    void fetchNextPage({ cancelRefetch: false })
  }, [hasNextPage, queryClient, queryKey, fetchNextPage])

  const restoreListPosition = useCallback(() => {
    if (restoreScrollY === null) return
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScrollY, behavior: 'instant' })
      restoringRef.current = false
      setRestoredPosition(initialPosition)
    })
    return () => cancelAnimationFrame(frame)
  }, [restoreScrollY, initialPosition])

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
                              // 그룹 전환은 첫 페이지부터 다시 시작합니다.
                              queryClient.removeQueries({
                                queryKey: itemListKeys.group(group.groupId),
                              })
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
        <div className={styles.seasonalShelf} aria-hidden="true">
          <HalloweenDecoration kind="candy" />
          <HalloweenDecoration kind="pumpkin" />
          <HalloweenDecoration kind="candy" />
        </div>
        {(pullProgress > 0 || isRefreshing) && (
          <div className={styles.pullIndicator}>
            <Loading progress={isRefreshing ? undefined : pullProgress} />
          </div>
        )}
        {isError && !data && (
          <button type="button" onClick={() => void refetch()}>
            목록 다시 불러오기
          </button>
        )}
        {refreshError && (
          <p role="alert" className={styles.refreshError}>
            새로고침하지 못했습니다. 다시 당겨서 시도해주세요.
          </p>
        )}
        {isLoadingGroups ||
        isLoadingItems ||
        (selectedGroup && (items.length > 0 || restoreScrollY !== null)) ? (
          <ItemCardList
            key={selectedGroupId}
            className={styles.itemList}
            isLoading={isLoadingGroups || isLoadingItems}
            items={items}
            onLoadMore={
              !isRefreshing &&
              hasNextPage &&
              !isFetching &&
              !isFetchNextPageError &&
              restoreScrollY === null
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
        {!isLoadingItems && isFetchingNextPage && (
          <p role="status">물품을 더 불러오는 중...</p>
        )}
        {!isLoadingItems && isFetchNextPageError && (
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
