'use client'

import { useEffect } from 'react'
import { GROUP_MEMBER_STATUS, USER_STATUS } from '@/constants/user'
import { formatMessagePreview } from '@/utils/content'
import { formatLastTime } from '@/utils/date'
import type { ChatRoom } from '@/types/chatRoom'
import styles from './ChatRoomCard.module.css'

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
        aria-label={`${statusMessage || `${room.otherUser.nickname}님`}과 ${room.targetItem.title} 채팅방 열기`}
      >
        <div className={styles.images}>
          <div
            className={`${styles.itemImage} ${room.targetItem.thumbnailImageUrl ? '' : styles.placeholder}`}
            style={{
              backgroundImage: `url("${room.targetItem.thumbnailImageUrl || '/icons/chat-image-placeholder.svg'}")`,
            }}
          />
          <div
            className={`${styles.offeredItemImage} ${room.offeredItem.thumbnailImageUrl ? '' : styles.placeholder}`}
            style={{
              backgroundImage: `url("${room.offeredItem.thumbnailImageUrl || '/icons/chat-image-placeholder.svg'}")`,
            }}
          />
        </div>
        <div className={styles.roomContent}>
          <div className={styles.topRow}>
            <strong className={styles.itemTitle}>
              {room.targetItem.title}
            </strong>
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
