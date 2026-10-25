'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import GroupCard from './GroupCard'
import { GROUP_ERRORS } from '@/constants/errors/group'
import { RECOMMENDED_GROUP_DESCRIPTION } from '@/constants/group'
import type { GroupCardData } from '@/types/group'
import { getAccessTokenOrRedirect } from '@/utils/auth'
import { setCurrentGroupId } from '@/utils/currentGroup'
import { API_BASE_URL } from '@/config/api'
import styles from './RecommendedGroupList.module.css'

type RecommendedGroupListProps = {
  showTitle?: boolean
  onJoin: (group: GroupCardData) => void
  onLeave?: (group: GroupCardData) => void
}

export default function RecommendedGroupList({
  showTitle = false,
  onJoin,
  onLeave,
}: RecommendedGroupListProps) {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupCardData[] | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchRecommendations() {
      const accessToken = getAccessTokenOrRedirect(router)
      if (!accessToken) return

      try {
        const response = await axios.get<{ data: { groups: GroupCardData[] } }>(
          `${API_BASE_URL}/groups/recommendations`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
          },
        )
        if (active) setGroups(response.data.data.groups)
      } catch (error) {
        if (active) setHasError(true)
        console.error(error)
      }
    }
    fetchRecommendations()
    return () => {
      active = false
    }
  }, [router])

  return (
    <section className={styles.recommendations}>
      {showTitle && <h2 className={styles.recommendationsTitle}>추천 그룹</h2>}
      <p className={styles.recommendationsDescription}>
        {RECOMMENDED_GROUP_DESCRIPTION}
      </p>
      <div className={styles.recommendationList}>
        {hasError && (
          <p role="alert" className={styles.emptyMessage}>
            {GROUP_ERRORS.GROUP_LIST_LOAD_FAILED}
          </p>
        )}
        {!hasError && !groups && (
          <p role="status">추천 그룹을 불러오는 중이에요.</p>
        )}
        {groups?.length === 0 && (
          <p className={styles.emptyMessage}>추천 그룹이 없어요.</p>
        )}
        {groups?.slice(0, 10).map((group, index) => (
          <div className={styles.recommendationRow} key={group.groupId}>
            <span
              className={`${styles.recommendationRank}${index < 3 ? ` ${styles.topRank}` : ''}`}
              aria-label={`${index + 1}위`}
            >
              {index + 1}
            </span>
            <GroupCard
              group={group}
              onJoin={() => onJoin(group)}
              onLeave={onLeave ? () => onLeave(group) : undefined}
              onSelect={() => {
                setCurrentGroupId(group.groupId)
                router.push(`/pages/items?groupId=${group.groupId}`)
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
