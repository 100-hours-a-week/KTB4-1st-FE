import styles from './ChatRoomInfo.module.css'

import { EXCHANGE_STATUS } from '@/constants/exchange'
import type { ExchangeActionStatus } from '@/types/chatRoom'

type ChatExchangeActionsProps = {
  isSeller: boolean
  exchangeRequestId: number
  canComplete: boolean
  isUpdating: boolean
  onUpdate: (status: ExchangeActionStatus) => void
}

export default function ChatExchangeActions({
  isSeller,
  exchangeRequestId,
  canComplete,
  isUpdating,
  onUpdate,
}: ChatExchangeActionsProps) {
  if (!isSeller) return null

  const disabled =
    isUpdating ||
    !Number.isSafeInteger(exchangeRequestId) ||
    exchangeRequestId < 1

  return (
    <div className={styles.exchangeActions}>
      <button
        type="button"
        onClick={() => onUpdate(EXCHANGE_STATUS.COMPLETED)}
        disabled={disabled || !canComplete}
      >
        교환 완료
      </button>
      <button
        type="button"
        onClick={() => onUpdate(EXCHANGE_STATUS.REJECTED)}
        disabled={disabled}
      >
        교환 거절
      </button>
    </div>
  )
}
