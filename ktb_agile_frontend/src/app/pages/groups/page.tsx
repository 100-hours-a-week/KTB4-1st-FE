'use client'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8080'


export default function GroupList() {
    const [errorMessage, setErrorMessage] = useState<string|null>(null);
    const [inputKeyword, setInputKeyword] = useState<string|null>(null);
    const router = useRouter()
    
    async function groupListViewProcess() {
      const accessToken = window.sessionStorage.getItem('accessToken')

      if (!accessToken) {
        setErrorMessage('로그인이 필요합니다.')
        router.replace('/auth/login')
        return
      }   
      
      try {
        const response = axios.get(
          `${API_BASE_URL}/users/me/groups?size=10&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        const data = (await response).data
        console.log('group list view : ', data)
      } catch (error) {
        console.error(error)
      }
    }

    async function searchProcess() {
      const accessToken = window.sessionStorage.getItem('accessToken')
      if (!accessToken) {
        setErrorMessage('로그인이 필요합니다.')
        router.replace('/auth/login')
        return
      }

      try {
        const response = axios.get(
          `${API_BASE_URL}/groups?keyword=${inputKeyword}&size=30&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        const data = (await response).data
        console.log('group search view : ', data)
      } catch (error) {
        console.error(error)
      }
    }

    async function leaveProcess() {
      const accessToken = window.sessionStorage.getItem('accessToken')
      if (!accessToken) {
        setErrorMessage('로그인이 필요합니다.')
        router.replace('/auth/login')
        return
      }  
      console.log('탈퇴')
      try {
        const response = axios.delete(
          `${API_BASE_URL}/groups/${1}/members/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        const data = (await response).data
        console.log('group search view : ', data)
      } catch (error) {
        console.error(error)
      }
    }

    async function recommendProcess() {
      const accessToken = window.sessionStorage.getItem('accessToken')
      if (!accessToken) {
        setErrorMessage('로그인이 필요합니다.')
        router.replace('/auth/login')
        return
      }

      try {
        const response = axios.get(
          `${API_BASE_URL}/groups/recommendations?latitude=37.3948&longitude=127.1112&size=10&cursor=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )

        const data = (await response).data
        console.log('group search view : ', data)
      } catch (error) {
        console.error(error)
      }
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
        />
        <button className={styles.searchButton} type="button" onClick={()=>searchProcess()}>

          그룹검색
        </button>
      </div>

      <button
        onClick={()=>groupListViewProcess()}>
        조회 연동
      </button>
      <button
        onClick={()=>recommendProcess()}>
        추천 연동
      </button>
      <button
        onClick={()=>leaveProcess()}>
        탈퇴 연동
      </button>
      
      

      <Navbar />
    </section>
  )
}
