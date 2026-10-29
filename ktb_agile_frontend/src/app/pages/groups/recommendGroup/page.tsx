'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RecommendedGroupList from '@/components/groups/RecommendedGroupList'
import GroupJoinModal from '@/components/groups/modal/GroupJoinModal'
import LeaveConfirmModal from '@/components/groups/modal/LeaveConfirmModal'
import LeaveFinalConfirmModal from '@/components/groups/modal/LeaveFinalConfirmModal'
import ModalDefault from '@/components/common/modal/Default'
import { useGroupLeave } from '@/hooks/useGroupLeave'
import type { GroupCardData } from '@/types/group'
import styles from '../page.module.css'

export default function RecommendGroup() {
  const router = useRouter()
  const [joinTarget, setJoinTarget] = useState<GroupCardData | null>(null)
  const [recommendationVersion, setRecommendationVersion] = useState(0)
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
    onSuccess: () => setRecommendationVersion((version) => version + 1),
  })
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
        <RecommendedGroupList
          key={recommendationVersion}
          onJoin={setJoinTarget}
          onLeave={handleGroupLeave}
        />
      </div>
      <GroupJoinModal
        group={joinTarget}
        onCancel={() => setJoinTarget(null)}
        onJoined={() => router.push('/pages/groups')}
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
    </section>
  )
}
