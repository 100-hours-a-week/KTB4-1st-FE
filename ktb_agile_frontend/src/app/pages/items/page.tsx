'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import RegisterIcon from '@/components/common/icons/RegisterIcon'
import Navbar from '@/components/common/navbar/Navbar'
import { mockJoinedGroups } from '@/data/mockGroups'
import styles from './page.module.css'

export default function ItemList() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    mockJoinedGroups[0]?.id ?? null,
  )
  const [isGroupMenuOpen, setGroupMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedGroup =
    mockJoinedGroups.find((group) => group.id === selectedGroupId) ?? null

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
          {selectedGroup ? (
            <div className={styles.groupDropdown} ref={dropdownRef}>
              <button
                className={styles.groupTrigger}
                type="button"
                onClick={() => setGroupMenuOpen((open) => !open)}
              >
                <span className={styles.groupName}>{selectedGroup.name}</span>
              </button>
              {isGroupMenuOpen && (
                <div className={styles.groupMenu}>
                  <ul className={styles.groupList}>
                    {mockJoinedGroups.map((group) => (
                      <li key={group.id}>
                        <button
                          className={`${styles.groupOption} ${
                            group.id === selectedGroup.id ? styles.selected : ''
                          }`}
                          type="button"
                          onClick={() => {
                            setSelectedGroupId(group.id)
                            setGroupMenuOpen(false)
                          }}
                        >
                          {group.name}
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
          {selectedGroup
            ? '등록된 물건이 없습니다.'
            : '그룹에 가입하지 않았습니다.'}
        </h1>
        <p className={styles.emptyDescription}>
          {selectedGroup
            ? `${selectedGroup.name}에 첫 물건을 등록해보세요.`
            : '그룹에 가입해서 물품들을 구경해보아요.'}
        </p>
      </div>
      {selectedGroup && (
        <div className={styles.registerArea}>
          <Link
            className={styles.registerButton}
            href="/pages/items/register"
          >
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
