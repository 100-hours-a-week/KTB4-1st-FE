'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import RegisterIcon from '@/components/common/icons/RegisterIcon'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'

const API_BASE_URL = 'http://127.0.0.1:8080'

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
  const [isGroupMenuOpen, setGroupMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const selectedGroup =
    joinedGroups.find((group) => group.groupId === selectedGroupId) ?? null

  useEffect(() => {
    const accessToken = window.sessionStorage.getItem('accessToken')

    if (!accessToken) {
      router.replace('/auth/login')
      return
    }

    const controller = new AbortController()

    async function fetchJoinedGroups() {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/users/me/groups?size=10&cursor`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )
        const groups = response.data.data.groups.map(({ groupId, groupName }) => ({
            groupId,
            groupName,
          }))

        setJoinedGroups(groups)   
        setSelectedGroupId(groups[0]?.groupId ?? null)
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
  }, [router])

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
    <section className={styles.page}>
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
                            setSelectedGroupId(group.groupId)
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
        </div>
      </header>
      <div className={styles.emptyState}>
        <h1 className={styles.emptyTitle}>
          {isLoadingGroups
            ? '그룹 목록을 불러오는 중입니다.'
            : selectedGroup
              ? '등록된 물건이 없습니다.'
              : '그룹에 가입하지 않았습니다.'}
        </h1>
        <p className={styles.emptyDescription}>
          {isLoadingGroups
            ? '잠시만 기다려주세요.'
            : selectedGroup
              ? `${selectedGroup.groupName}에 첫 물건을 등록해보세요.`
              : '그룹에 가입해서 물품들을 구경해보아요.'}
        </p>
      </div>
      {selectedGroup && (
        <div className={styles.registerArea}>
          <Link className={styles.registerButton} href="/pages/items/register">
            <span className={styles.registerIcon}>
              <RegisterIcon />
            </span>
            <span>등록하기</span>
          </Link>
        </div>
      )}
      <Navbar />
    </section>
  )
}
