import styles from './ChatRoomMenu.module.css'

type ChatRoomMenuProps = {
  isLeaving: boolean
  onLeave: () => void
}

export default function ChatRoomMenu({
  isLeaving,
  onLeave,
}: ChatRoomMenuProps) {
  return (
    <div className={styles.menu}>
      <button type="button" onClick={onLeave} disabled={isLeaving}>
        {isLeaving ? '나가는 중...' : '채팅방 나가기'}
      </button>
    </div>
  )
}
