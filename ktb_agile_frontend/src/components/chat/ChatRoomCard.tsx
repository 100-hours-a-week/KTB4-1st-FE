'use client'

import { useEffect } from 'react'
import { GROUP_MEMBER_STATUS, USER_STATUS } from '@/constants/user'
import { formatMessagePreview } from '@/utils/content'
import { formatLastTime } from '@/utils/date'
import type { ChatRoom } from '@/types/chatRoom'
import styles from './ChatRoomCard.module.css'

function formatItemTitle(title: string) {
  const characters = Array.from(title)
  return characters.length > 15
    ? `${characters.slice(0, 15).join('')}...`
    : title
}

export default function ChatRoomCard({
  room,
  onClick,
}: {
  room: ChatRoom
  onClick: () => void
}) {
  const { userStatus, groupMemberStatus } = room.otherUser
  const isWithdrawn = userStatus === USER_STATUS.WITHDRAWN
  const hasLeftGroup = groupMemberStatus === GROUP_MEMBER_STATUS.LEFT
  const isActive =
    userStatus === USER_STATUS.ACTIVE &&
    groupMemberStatus === GROUP_MEMBER_STATUS.ACTIVE
  const hasUnknownStatus = !isWithdrawn && !hasLeftGroup && !isActive
  const offeredItem = room.offeredItem
  const offeredItemCount = room.offeredItemCount ?? 1
  const additionalOfferedItemCount = Math.max(0, offeredItemCount - 1)
  const offeredItemTitle = offeredItem?.title || '제시 물품 정보 없음'
  const statusMessage = isWithdrawn
    ? '탈퇴한 사용자'
    : hasLeftGroup
      ? '그룹을 떠난 사용자'
      : hasUnknownStatus
        ? '알 수 없는 오류'
        : null

  useEffect(() => {
    if (hasUnknownStatus) {
      console.error('채팅 상대방의 상태 조합을 처리할 수 없습니다.', {
        chatRoomId: room.chatRoomId,
        userId: room.otherUser.userId,
        userStatus,
        groupMemberStatus,
      })
    }
  }, [
    hasUnknownStatus,
    room.chatRoomId,
    room.otherUser.userId,
    userStatus,
    groupMemberStatus,
  ])

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={styles.room}
        aria-label={`${statusMessage || `${room.otherUser.nickname}님`}과 ${room.targetItem.title} ↔ ${offeredItem?.title || '제시 물품 정보 없음'}${additionalOfferedItemCount > 0 ? ` 외 ${additionalOfferedItemCount}개` : ''} 채팅방 열기`}
      >
        <div className={styles.images}>
          <div
            className={`${styles.itemImage} ${room.targetItem.thumbnailImageUrl ? '' : styles.placeholder}`}
            style={{
              backgroundImage: `url("${room.targetItem.thumbnailImageUrl || '/icons/chat-image-placeholder.svg'}")`,
            }}
          />
          <div
            className={`${styles.offeredItemImage} ${offeredItem?.thumbnailImageUrl ? '' : styles.placeholder}`}
            style={{
              backgroundImage: `url("${offeredItem?.thumbnailImageUrl || '/icons/chat-image-placeholder.svg'}")`,
            }}
          />
          {additionalOfferedItemCount > 0 && (
            <span className={styles.offeredItemCount} aria-hidden="true">
              +{additionalOfferedItemCount}
            </span>
          )}
        </div>
        <div className={styles.roomContent}>
          <div className={styles.topRow}>
            <div className={styles.itemExchange}>
              <strong
                className={styles.itemTitle}
                title={room.targetItem.title}
              >
                {formatItemTitle(room.targetItem.title)}
              </strong>
              <svg
                className={styles.exchangeArrow}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M19 12H5m0 0 6-4.5M5 12l6 4.5" />
              </svg>
              <span
                className={styles.offeredItemTitle}
                title={offeredItemTitle}
              >
                {formatItemTitle(offeredItemTitle)}
                {additionalOfferedItemCount > 0
                  ? ` 외 ${additionalOfferedItemCount}개`
                  : ''}
              </span>
            </div>
            <span className={styles.time}>
              {formatLastTime(room.lastMessageAt)}
            </span>
          </div>
          {room.group && (
            <p className={styles.groupName}>{room.group.groupName}</p>
          )}
          <div className={styles.bottomRow}>
            <p className={styles.preview}>
              {statusMessage ||
                (room.lastMessage
                  ? `${room.lastMessage.senderId === null ? '' : `(${room.lastMessage.senderId === room.otherUser.userId ? room.otherUser.nickname : '나'}) `}${formatMessagePreview(room.lastMessage.content)}`
                  : `${room.otherUser.nickname}님과의 대화`)}
            </p>
            {room.unreadMessageCount > 0 && (
              <span className={styles.unread}>
                {room.unreadMessageCount > 99 ? '99+' : room.unreadMessageCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
