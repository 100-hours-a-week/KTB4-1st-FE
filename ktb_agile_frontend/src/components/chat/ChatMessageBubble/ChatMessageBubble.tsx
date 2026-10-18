import styles from './ChatMessageBubble.module.css'
import { CHAT_MESSAGE_TYPE } from '@/constants/chat'
import type { ChatMessageType } from '@/types/chatMessage'

export type ChatMessage = {
  id: number
  messageType: ChatMessageType
  side: 'mine' | 'theirs'
  content: string
  time: string
  dateKey: string
  dateLabel: string
  senderName: string
}

type ChatMessageBubbleProps = {
  message: ChatMessage
}

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  if (message.messageType === CHAT_MESSAGE_TYPE.SYSTEM) {
    return (
      <div className={`${styles.messageRow} ${styles.system}`}>
        <p className={styles.systemContent}>{message.content}</p>
      </div>
    )
  }
  const isMine = message.side === 'mine'

  return (
    <div
      className={`${styles.messageRow} ${isMine ? styles.mine : styles.theirs}`}
    >
      {!isMine && (
        <span className={styles.avatar} aria-hidden="true">
          {message.senderName.charAt(0)}
        </span>
      )}
      {isMine && <time>{message.time}</time>}
      <p className={styles.bubble}>{message.content}</p>
      {!isMine && <time>{message.time}</time>}
    </div>
  )
}
