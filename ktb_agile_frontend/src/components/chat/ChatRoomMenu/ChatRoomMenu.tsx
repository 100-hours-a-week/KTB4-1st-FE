import type { ChatRoom, ChatExchangeStatus } from '@/types/chatRoom'
import { CHAT_EXCHANGE_STATUS } from '@/constants/chat'
import styles from './ChatRoomMenu.module.css'

type ChatRoomMenuProps = {
  isRequester: boolean
  exchangeStatus: ChatExchangeStatus
  itemAvailable: boolean | null
  exchangeRequestId: ChatRoom['exchangeRequestId']
  isUpdatingExchange: boolean
  isLeaving: boolean
  onCancelExchange: () => void
  onLeave: () => void
}

export default function ChatRoomMenu({
  isRequester,
  exchangeStatus,
  itemAvailable,
  exchangeRequestId,
  isUpdatingExchange,
  isLeaving,
  onCancelExchange,
  onLeave,
}: ChatRoomMenuProps) {
  const canCancel =
    isRequester &&
    exchangeStatus === CHAT_EXCHANGE_STATUS.AVAILABLE &&
    itemAvailable === true &&
    Number.isSafeInteger(exchangeRequestId) &&
    exchangeRequestId > 0

  return (
    <div className={styles.menu}>
      {canCancel && (
        <button
          type="button"
          onClick={onCancelExchange}
          disabled={isUpdatingExchange}
        >
          제안 취소
        </button>
      )}
      <button type="button" onClick={onLeave} disabled={isLeaving}>
        {isLeaving ? '나가는 중...' : '채팅방 나가기'}
      </button>
    </div>
  )
}
