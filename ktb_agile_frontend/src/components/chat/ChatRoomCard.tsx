import styles from './ChatRoomCard.module.css'

export type ChatRoom = {
  chatRoomId: number
  chatRoomStatus: string
  exchangeRequestId: number
  direction: 'SENT' | 'RECEIVED'
  group: { groupId: number; groupName: string }
  otherUser: {
    userId: number
    nickname: string
    profileImageUrl: string | null
  }
  targetItem: {
    itemId: number
    title: string
    thumbnailImageUrl: string | null
  }
  lastMessage: {
    messageId: number
    content: string
    senderId: number
    createdAt: string
  } | null
  unreadMessageCount: number
  lastMessageAt: string | null
}

function formatTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const elapsed = Date.now() - date.getTime()
  if (elapsed >= 0 && elapsed < 60_000) return '방금 전'
  if (elapsed >= 0 && elapsed < 3_600_000)
    return `${Math.floor(elapsed / 60_000)}분 전`
  if (elapsed >= 0 && elapsed < 86_400_000)
    return `${Math.floor(elapsed / 3_600_000)}시간 전`
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '어제'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export default function ChatRoomCard({ room }: { room: ChatRoom }) {
  return (
    <li className={styles.room}>
      <div className={styles.images}>
        <div
          className={`${styles.itemImage} ${room.targetItem.thumbnailImageUrl ? '' : styles.placeholder}`}
          style={{
            backgroundImage: `url("${room.targetItem.thumbnailImageUrl || '/icons/chat-image-placeholder.svg'}")`,
          }}
        />
        <div
          className={`${styles.avatar} ${room.otherUser.profileImageUrl ? '' : styles.placeholder}`}
          style={{
            backgroundImage: `url("${room.otherUser.profileImageUrl || '/icons/chat-image-placeholder.svg'}")`,
          }}
        />
      </div>
      <div className={styles.roomContent}>
        <div className={styles.topRow}>
          <strong className={styles.itemTitle}>{room.targetItem.title}</strong>
          <span className={styles.time}>{formatTime(room.lastMessageAt)}</span>
        </div>
        <p className={styles.groupName}>{room.group.groupName}</p>
        <div className={styles.bottomRow}>
          <p className={styles.preview}>
            {room.lastMessage
              ? `(${room.lastMessage.senderId === room.otherUser.userId ? room.otherUser.nickname : '나'}) ${room.lastMessage.content}`
              : `${room.otherUser.nickname}님과의 대화`}
          </p>
          {room.unreadMessageCount > 0 && (
            <span className={styles.unread}>
              {room.unreadMessageCount > 99 ? '99+' : room.unreadMessageCount}
            </span>
          )}
        </div>
      </div>
    </li>
  )
}
