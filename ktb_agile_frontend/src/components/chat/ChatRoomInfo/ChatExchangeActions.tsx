import styles from './ChatRoomInfo.module.css'

export type ExchangeActionStatus = 'COMPLETED' | 'REJECTED'

type ChatExchangeActionsProps = {
  isSeller: boolean
  exchangeRequestId: number
  isUpdating: boolean
  onUpdate: (status: ExchangeActionStatus) => void
}

export default function ChatExchangeActions({
  isSeller,
  exchangeRequestId,
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
        onClick={() => onUpdate('COMPLETED')}
        disabled={disabled}
      >
        교환 완료
      </button>
      <button
        type="button"
        onClick={() => onUpdate('REJECTED')}
        disabled={disabled}
      >
        교환 거절
      </button>
    </div>
  )
}
