import ChatExchangeActions, {
  type ExchangeActionStatus,
} from './ChatExchangeActions'
import styles from './ChatRoomInfo.module.css'

export type ExchangeStatus =
  'available' | 'completed' | 'rejected' | 'canceled' | 'closed'

type ChatRoomInfoProps = {
  title: string
  group: string
  otherUser: string
  image: string | null
  isSeller: boolean
  itemId: number
  exchangeRequestId: number
  exchangeStatus: ExchangeStatus
  itemAvailable: boolean | null
  isUpdatingExchange: boolean
  returnTo: string
  onUpdateExchange: (status: ExchangeActionStatus) => void
  onEditExchange: (
    itemId: number,
    exchangeRequestId: number,
    returnTo: string,
  ) => void
}

const statusLabel: Record<ExchangeStatus, string> = {
  available: '거래 가능',
  completed: '거래 완료',
  rejected: '거래 거절',
  canceled: '제안 취소',
  closed: '채팅 종료',
}

export default function ChatRoomInfo({
  title,
  group,
  otherUser,
  image,
  isSeller,
  itemId,
  exchangeRequestId,
  exchangeStatus,
  itemAvailable,
  isUpdatingExchange,
  returnTo,
  onUpdateExchange,
  onEditExchange,
}: ChatRoomInfoProps) {
  const canEdit =
    !isSeller &&
    exchangeStatus === 'available' &&
    itemAvailable === true &&
    Number.isSafeInteger(itemId) &&
    itemId > 0 &&
    Number.isSafeInteger(exchangeRequestId) &&
    exchangeRequestId > 0

  return (
    <article className={styles.productCard}>
      <div className={styles.productImage}>
        {image ? (
          <img className={styles.actualProductImage} src={image} alt="" />
        ) : (
          <img
            src="/figma/chat/product-image-icon.svg"
            alt=""
            width="18.5"
            height="18.5"
          />
        )}
      </div>
      <div className={styles.productDetails}>
        <div className={styles.productTitleRow}>
          <strong>상품명: {title}</strong>
          <span>
            {exchangeStatus === 'available' && itemAvailable === false
              ? '거래 완료'
              : statusLabel[exchangeStatus]}
          </span>
        </div>
        <p>그룹: {group}</p>
        <p>상대: {otherUser}</p>
      </div>
      {canEdit && (
        <div className={styles.exchangeActions}>
          <button
            type="button"
            onClick={() => onEditExchange(itemId, exchangeRequestId, returnTo)}
          >
            제안 수정
          </button>
        </div>
      )}
      <ChatExchangeActions
        isSeller={
          isSeller && exchangeStatus === 'available' && itemAvailable === true
        }
        exchangeRequestId={exchangeRequestId}
        isUpdating={isUpdatingExchange}
        onUpdate={onUpdateExchange}
      />
    </article>
  )
}
