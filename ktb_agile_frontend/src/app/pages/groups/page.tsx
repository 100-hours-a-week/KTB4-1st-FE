'use client'

import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import type { GroupCardData } from '@/types/group'
import GroupCard from '@/components/groups/GroupCard'
import LeaveConfirmModal from '@/components/groups/modal/LeaveConfirmModal'
import LeaveFinalConfirmModal from '@/components/groups/modal/LeaveFinalConfirmModal'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { setCurrentGroupId } from '@/utils/currentGroup'
import GroupJoinModal from '@/components/groups/modal/GroupJoinModal'
import RecommendedGroupList from '@/components/groups/RecommendedGroupList'
import { NO_GROUP_MSG, NO_SEARCH_RESULT_MSG } from '@/constants/group'
import { getAccessTokenOrRedirect } from '@/utils/auth'
import { useGroupLeave } from '@/hooks/useGroupLeave'
import ModalDefault from '@/components/common/modal/Default'

export default function GroupListPage() {
  const [inputKeyword, setInputKeyword] = useState('')
  const [myGroupList, setMyGroupList] = useState<GroupListResponse | null>(null)
  const [searchGroupList, setSearchGroupList] =
    useState<GroupListResponse | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [joinTarget, setJoinTarget] = useState<GroupCardData | null>(null)
  const router = useRouter()
  const hasNoJoinedGroups = myGroupList?.data.groups.length === 0
  const hasJoinedGroups = (myGroupList?.data.groups.length ?? 0) > 0

  type GroupListResponse = {
    data: {
      groups: GroupCardData[]
    }
  }

  const fetchGroupList = useCallback(
    async (keyword = '') => {
      try {
        const trimmedKeyword = keyword.trim()

        if (!trimmedKeyword) {
          const response = await axios.get<GroupListResponse>(
            '/bff/me/groups',
            {
              headers: {
                Accept: 'application/json',
              },
            },
          )

          setIsSearchMode(false)
          setMyGroupList(response.data)
          return
        }

        const accessToken = getAccessTokenOrRedirect(router)
        if (!accessToken) return

        const response = await axios.get<GroupListResponse>(
          `${API_BASE_URL}/groups?keyword=${encodeURIComponent(trimmedKeyword)}&size=30&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        setIsSearchMode(true)
        setSearchGroupList(response.data)
      } catch (error) {
        console.error(error)
      }
    },
    [router],
  )

  useEffect(() => {
    async function initializeGroupList() {
      await fetchGroupList()
    }

    initializeGroupList()
  }, [fetchGroupList])

  function handleSearch() {
    fetchGroupList(inputKeyword)
  }

  function handleJoin(group: GroupCardData) {
    setJoinTarget(group)
  }

  function handleJoined(joinedGroup: GroupCardData) {
    setMyGroupList((previous) => ({
      data: {
        ...previous?.data,
        groups: [
          joinedGroup,
          ...(previous?.data.groups ?? []).filter(
            (group) => group.groupId !== joinedGroup.groupId,
          ),
        ],
      },
    }))
    setJoinTarget(null)
    setInputKeyword('')
    setIsSearchMode(false)
  }

  const {
    leaveTarget,
    leaveModalStep,
    isLeaving,
    leaveError,
    dismissLeaveError,
    handleGroupLeave,
    cancelGroupLeave,
    proceedGroupLeave,
    confirmGroupLeave,
  } = useGroupLeave({
    onSuccess: (group) => {
      setMyGroupList((previous) =>
        previous
          ? {
              ...previous,
              data: {
                ...previous.data,
                groups: previous.data.groups.filter(
                  (item) => item.groupId !== group.groupId,
                ),
              },
            }
          : previous,
      )
      setInputKeyword('')
      setIsSearchMode(false)
    },
  })

  const displayedGroupList = isSearchMode ? searchGroupList : myGroupList
  const emptyMessage = isSearchMode ? NO_SEARCH_RESULT_MSG : NO_GROUP_MSG

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          type="button"
          aria-label="뒤로가기"
          onClick={() => router.back()}
        >
          {/* 뒤로가기 아이콘 */}
          <svg viewBox="0 0 24 24">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1 className={styles.title}>그룹</h1>
        <div className={styles.headerActions}>
          {hasJoinedGroups && (
            <button
              className={`${styles.createButton} ${styles.recommendButton}`}
              type="button"
              onClick={() => router.push('/pages/groups/recommendGroup')}
            >
              추천 그룹
            </button>
          )}
          <button
            className={styles.createButton}
            type="button"
            onClick={() => router.push('/pages/groups/create')}
          >
            그룹 생성하기
          </button>
        </div>
      </header>

      <div className={styles.search}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="그룹명을 검색"
          value={inputKeyword}
          onChange={(event) => setInputKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch()
          }}
        />
        <button
          className={styles.searchButton}
          type="button"
          onClick={handleSearch}
        >
          그룹검색
        </button>
      </div>

      {displayedGroupList &&
        (displayedGroupList.data.groups.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>{emptyMessage}</p>
            {hasNoJoinedGroups && (
              <div className={styles.recommendations}>
                <RecommendedGroupList
                  showTitle
                  onJoin={handleJoin}
                  onLeave={handleGroupLeave}
                />
              </div>
            )}
          </div>
        ) : (
          displayedGroupList?.data.groups.map((group) => (
            <GroupCard
              key={group.groupId}
              group={group}
              onSelect={() => {
                setCurrentGroupId(group.groupId)
                router.push(`/pages/items?groupId=${group.groupId}`)
              }}
              onLeave={() => handleGroupLeave(group)}
              onJoin={() => handleJoin(group)}
            />
          ))
        ))}

      <GroupJoinModal
        group={joinTarget}
        onCancel={() => setJoinTarget(null)}
        onJoined={handleJoined}
      />

      {leaveTarget && leaveModalStep === 1 && (
        <LeaveConfirmModal
          groupName={leaveTarget.groupName}
          onCancel={cancelGroupLeave}
          onConfirm={proceedGroupLeave}
        />
      )}

      {leaveTarget && leaveModalStep === 2 && (
        <LeaveFinalConfirmModal
          groupName={leaveTarget.groupName}
          isLastMember={leaveTarget.memberCount === 1}
          isLoading={isLeaving}
          onCancel={cancelGroupLeave}
          onConfirm={confirmGroupLeave}
        />
      )}
      {leaveError && (
        <ModalDefault
          message={leaveError}
          confirmLabel="확인"
          onConfirm={dismissLeaveError}
        />
      )}
      <Navbar />
    </section>
  )
}
