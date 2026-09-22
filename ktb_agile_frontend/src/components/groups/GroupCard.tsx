'use client'

import { useState } from 'react'
import type { GroupCardData } from '@/types/group'
import styles from './GroupCard.module.css'

type GroupCardAction = {
  label: string
  tone: 'primary' | 'secondary'
  onClick?: () => void
}

export type GroupCardProps = {
  group: GroupCardData
  className?: string
  onJoin?: () => void
  onSelect?: () => void
  onLeave?: () => void
  onShare?: () => void
}

export default function GroupCard({
  group,
  onJoin,
  onSelect,
  onLeave,
  onShare,
}: GroupCardProps) {
  const {
    groupName,
    memberCount,
    roadAddress,
    itemCount,
    lastItemCreatedAt,
    groupContent,
    isJoined,
  } = group
  const [isExpanded, setIsExpanded] = useState(false)

  const actions: GroupCardAction[] = isJoined
    ? [
        { label: '참여 중', tone: 'primary', onClick: onSelect },
        { label: '그룹 탈퇴', tone: 'secondary', onClick: onLeave },
        { label: '공유', tone: 'secondary', onClick: onShare },
      ]
    : [
        { label: '참여하기', tone: 'primary', onClick: onJoin },
        { label: '공유', tone: 'secondary', onClick: onShare },
      ]

  return (
    <div className={styles.groupList}>
        <article className={styles.card}>
        <button
            className={styles.summaryButton}
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
        >
            <span className={styles.summaryContent}>
            <span className={styles.groupName}>{groupName}</span>
            <span className={styles.metadata}>
                <span>멤버 {memberCount}명</span>
                <span className={styles.address}>
                {roadAddress}
                </span>
            </span>
            <span className={styles.metadata}>
                <span>공개 물품 {itemCount}개</span>
                <span>{lastItemCreatedAt}</span>
            </span>
            </span>

            <span
            className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`}
            >
            <svg viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
            </svg>
            </span>
        </button>

        {isExpanded && (
            <div className={styles.details}>
            <p className={styles.description}>{groupContent}</p>

            <div
                className={`${styles.actions} ${
                isJoined ? styles.actionsThree : styles.actionsTwo
                }`}
            >
                {actions.map((action) => (
                <button
                    className={`${styles.actionButton} ${
                    action.tone === 'primary'
                        ? styles.primaryAction
                        : styles.secondaryAction
                    }`}
                    type="button"
                    key={action.label}
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
                ))}
            </div>
            </div>
        )}
        </article>
    </div>
  )
}
