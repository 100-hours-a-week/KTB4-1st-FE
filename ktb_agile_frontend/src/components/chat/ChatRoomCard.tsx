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
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={styles.room}
        aria-label={`${room.otherUser.nickname}님과 ${room.targetItem.title} 채팅방 열기`}
      >
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
              {room.lastMessage
                ? `${room.lastMessage.senderId === null ? '' : `(${room.lastMessage.senderId === room.otherUser.userId ? room.otherUser.nickname : '나'}) `}${formatMessagePreview(room.lastMessage.content)}`
                : `${room.otherUser.nickname}님과의 대화`}
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
