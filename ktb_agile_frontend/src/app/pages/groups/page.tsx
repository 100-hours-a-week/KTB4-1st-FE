'use client'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useEffect } from 'react'
import type { GroupCardData } from '@/types/group'
import GroupCard from '@/components/groups/GroupCard'
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8080'


export default function GroupList() {
    const [errorMessage, setErrorMessage] = useState<string|null>(null);
    const [inputKeyword, setInputKeyword] = useState<string|null>(null);
    const [myGroupList, setMyGroupList] = useState<GroupListResponse | null>(null);
    const router = useRouter()
  
    type GroupListResponse = {
      data: {
        groups: GroupCardData[]
      }
    }

    useEffect(()=>{
      async function groupListViewProcess() {
        const accessToken = window.sessionStorage.getItem('accessToken')

        if (!accessToken) {
          setErrorMessage('로그인이 필요합니다.')
          router.replace('/auth/login')
          return
        }   
        
        try {
          const response = await axios.get<GroupListResponse>(
            `${API_BASE_URL}/users/me/groups?size=10&cursor=`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            },
          )

          setMyGroupList(response.data)
        } catch (error) {
          console.error(error)
        }
      }

      groupListViewProcess()
    },[])
   



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
        />
        <button className={styles.searchButton} type="button">

          그룹검색
        </button>
      </div>
       {
        myGroupList?.data.groups.map((group)=> (
          <GroupCard 
            group={group}
            key={group.groupId}
           />
        ))
       }     
      <Navbar />
    </section>
  )
}
