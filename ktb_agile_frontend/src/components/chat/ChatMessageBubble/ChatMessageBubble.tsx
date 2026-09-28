import styles from './ChatMessageBubble.module.css'

export type ChatMessage = {
  id: number
  side: 'mine' | 'theirs'
  content: string
  time: string
  senderName: string
}

type ChatMessageBubbleProps = {
  message: ChatMessage
}

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
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
