'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RecommendedGroupList from '@/components/groups/RecommendedGroupList'
import GroupJoinModal from '@/components/groups/modal/GroupJoinModal'
import type { GroupCardData } from '@/types/group'
import styles from '../page.module.css'

export default function RecommendGroup() {
  const router = useRouter()
  const [joinTarget, setJoinTarget] = useState<GroupCardData | null>(null)
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          type="button"
          aria-label="뒤로가기"
          onClick={() => router.push('/pages/groups')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
          </svg>
        </button>
        <h1 className={styles.title}>추천 그룹</h1>
      </header>
      <div className={styles.recommendationContent}>
        <RecommendedGroupList onJoin={setJoinTarget} />
      </div>
      <GroupJoinModal
        group={joinTarget}
        onCancel={() => setJoinTarget(null)}
        onJoined={() => router.push('/pages/groups')}
      />
    </section>
  )
}
