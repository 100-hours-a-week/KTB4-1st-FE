'use client'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import type { GroupCardData } from '@/types/group'
import GroupCard from '@/components/groups/GroupCard'
import LeaveConfirmModal from './modal/LeaveConfirmModal'
import LeaveFinalConfirmModal from './modal/LeaveFinalConfirmModal'
import axios from 'axios'
import ModalDefault from '@/components/common/modal/Default'

const API_BASE_URL = 'http://127.0.0.1:8080'
const NO_SEARCH_RESULT_MSG = '검색된 그룹이 없어요!\n원하는 그룹을 찾을 수 없어요. 새로운 그룹을 만들어보세요!'
const NO_GROUP_MSG = '참여하고 있는 그룹이 없어요! 새로운 그룹에 참여해보세요!'
const RECOMMENDED_GROUP_DESCRIPTION = '가입된 사용자가 많은 순서대로 보여드려요'

export default function GroupList() {
    const [inputKeyword, setInputKeyword] = useState('')
    const [curGroupList, setCurGroupList] = useState<GroupListResponse | null>(null)
    const [recommendGroupsList, setRecommendGroupsList] = useState<GroupListResponse | null>(null)
    const [isSearchMode, setIsSearchMode] = useState(false)
    const [leaveTarget, setLeaveTarget] = useState<GroupCardData | null>(null)
    const [leaveModalStep, setLeaveModalStep] = useState<1 | 2 | null>(null)
    const [isLeaving, setIsLeaving] = useState(false)
    const [joinTarget, setJoinTarget] = useState<GroupCardData |null>(null)
    const [isJoining, setIsJoining] = useState(false)
    const [openErrorModal, setOpenErrorModal] = useState(false);
    const router = useRouter()
  
    type GroupListResponse = {
      data: {
        groups: GroupCardData[]
        nextCursor?: string | null
      }
    }

    const fetchGroupList = useCallback(async (keyword = '') => {
      const accessToken = window.sessionStorage.getItem('accessToken')

      if (!accessToken) {
        router.replace('/auth/login')
        return
      }

      try {
        const trimmedKeyword = keyword.trim()

        if (!trimmedKeyword) {
          const response = await axios.get<GroupListResponse>(
            `${API_BASE_URL}/users/me/groups?size=10&cursor=`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            },
          )

          setIsSearchMode(false)
          setCurGroupList(response.data)
          return
        }

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
        setCurGroupList(response.data)
      } catch (error) {
        console.error(error)
      }
    }, [router])

    useEffect(() => {
      async function initializeGroupList() {
        await fetchGroupList()
      }

      initializeGroupList()
    }, [fetchGroupList])

    useEffect(() => {
      async function recommendGroupListViewProcess() {
        const accessToken = window.sessionStorage.getItem('accessToken')

        if (!accessToken) {
          router.replace('/auth/login')
          return
        }

        try {
          const response = axios.get<GroupListResponse>(
            `${API_BASE_URL}/groups/recommendations?latitude=37.3948&longitude=127.1112&size=10&cursor=`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            },
          )

          const data = (await response).data
          setRecommendGroupsList(data)
        } catch (error) {
          console.error(error)
        }
      }

      recommendGroupListViewProcess()
    }, [router])

    function handleSearch() {
      fetchGroupList(inputKeyword)
    }
  
    function handleLeave(group: GroupCardData) {
      setLeaveTarget(group)
      setLeaveModalStep(1)
    }

    function handleJoin(group: GroupCardData){
      setJoinTarget(group)
    } 

    async function confirmJoin(){
      if (!joinTarget || isJoining) return

      const accessToken = window.sessionStorage.getItem('accessToken')

      if (!accessToken) {
        router.replace('/auth/login')
        return
      }

      setIsJoining(true)
      try {
        await axios.post(
          `${API_BASE_URL}/groups/${joinTarget?.groupId}/members`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )
        setJoinTarget(null)
        window.location.reload()
      } catch (error) {
        console.error(error)        
        setOpenErrorModal(true)
        setJoinTarget(null)

      } finally {
        setIsJoining(false)
      }
    }
   
    
    async function confirmLeave() {
      if (!leaveTarget || isLeaving) return

      const accessToken = window.sessionStorage.getItem('accessToken')

      if (!accessToken) {
        router.replace('/auth/login')
        return
      }

      setIsLeaving(true)
      try {
        await axios.delete(
          `${API_BASE_URL}/groups/${leaveTarget.groupId}/members/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )
        setLeaveModalStep(null)
        setLeaveTarget(null)
        setInputKeyword('')
        setTimeout(()=>location.reload(), 1500)
        
        await fetchGroupList()
      } catch (error) {
        console.error(error)
      } finally {
        setIsLeaving(false)
      }
    }

    const emptyMessage = isSearchMode ? NO_SEARCH_RESULT_MSG : NO_GROUP_MSG



    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={()=>router.back()}>
              {/* 뒤로가기 아이콘 */}
            <svg viewBox="0 0 24 24">
              <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
            </svg>
          </button>
          <h1 className={styles.title}>그룹</h1>
          <button className={styles.createButton} type="button" onClick={()=>router.push('/pages/groups/create')}>
            그룹 생성하기
          </button>
        </header>

        <div className={styles.search}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="그룹명을 검색"
            onChange={(event)=>setInputKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSearch()
            }}
          />
          <button className={styles.searchButton} type="button" onClick={handleSearch}>
            그룹검색
          </button>
        </div>

        {curGroupList &&
          (curGroupList.data.groups.length === 0
            ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyMessage}>{emptyMessage}</p>

              <section className={styles.recommendations}>
                <h2 className={styles.recommendationsTitle}>추천 그룹</h2>
                <p className={styles.recommendationsDescription}>
                  {RECOMMENDED_GROUP_DESCRIPTION}
                </p>

                <div className={styles.recommendationList}>
                  {recommendGroupsList?.data.groups.map((group) => (
                    <GroupCard key={group.groupId} group={group} 
                    onLeave={() => handleLeave(group)} 
                    onJoin={()=>handleJoin(group)}/>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            curGroupList.data.groups.map((group) => (
              <GroupCard key={group.groupId} group={group}
               onLeave={() => handleLeave(group)} 
               onJoin={()=>handleJoin(group)}/>
            ))
          ))}

        {joinTarget 
          && (
            <ModalDefault
              message='참여 하시겠습니까?'
              onConfirm={confirmJoin}
              onCancel={() => setJoinTarget(null)}
              />
          )}
          {openErrorModal&&(
            <ModalDefault
            message='오류가 발생했습니다'
            onConfirm={() =>setOpenErrorModal(false)}/>
          )}

        {leaveTarget && leaveModalStep === 1 && (
          <LeaveConfirmModal
            groupName={leaveTarget.groupName}
            onCancel={() => {
              setLeaveModalStep(null)
              setLeaveTarget(null)
            }}
            onConfirm={() => setLeaveModalStep(2)}
          />
        )}

        {leaveTarget && leaveModalStep === 2 && (
          <LeaveFinalConfirmModal
            groupName={leaveTarget.groupName}
            isLastMember={leaveTarget.memberCount === 1}
            isLoading={isLeaving}
            onCancel={() => {
              if (isLeaving) return
              setLeaveModalStep(null)
              setLeaveTarget(null)
            }}
            onConfirm={confirmLeave}
          />
        )}
        <Navbar />
      </section>
    )
  }
