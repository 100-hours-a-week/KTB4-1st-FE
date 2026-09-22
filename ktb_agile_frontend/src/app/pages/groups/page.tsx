'use client'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import type { GroupCardData } from '@/types/group'
import GroupCard from '@/components/groups/GroupCard'
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8080'
const NO_GROUP_MSG = '참여하고 있는 그룹이 없어요!\n새로운 그룹에 참여해보세요!'

export default function GroupList() {
    const [inputKeyword, setInputKeyword] = useState('')
    const [curGroupList, setCurGroupList] = useState<GroupListResponse | null>(null)
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

    function handleSearch() {
      fetchGroupList(inputKeyword)
    }
  



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
        (curGroupList.data.groups.length === 0 ? (
          <p className={styles.emptyMessage}>{NO_GROUP_MSG}</p>
        ) : (
          curGroupList.data.groups.map((group) => (
            <GroupCard key={group.groupId} group={group} />
          ))
        ))}
      <Navbar />
    </section>
  )
}
