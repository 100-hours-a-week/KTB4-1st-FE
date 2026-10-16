import ChatExchangeActions, {
  type ExchangeActionStatus,
} from './ChatExchangeActions'
import styles from './ChatRoomInfo.module.css'
import type { ChatRoomDetail } from '@/types/chatRoom'

export type ExchangeStatus =
  'available' | 'completed' | 'rejected' | 'canceled' | 'closed'

type ChatRoomInfoProps = {
  title: string
  group: string
  otherUser: string
  image: string | null
  isSeller: boolean
  isRequester: boolean
  exchangeRequest: ChatRoomDetail['exchangeRequest']
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
  isRequester,
  exchangeRequest,
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
    isRequester &&
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
              ? '재고 부족'
              : statusLabel[exchangeStatus]}
          </span>
        </div>
        <p>
          요청 수량: {exchangeRequest.requestedQuantity}개 / 재고:{' '}
          {exchangeRequest.requestedItem.availableQuantity}개
        </p>
        {group && <p>그룹: {group}</p>}
        {otherUser && <p>상대: {otherUser}</p>}
        <div className={styles.offeredItems}>
          <strong>제공 물품</strong>
          {exchangeRequest.offeredItems.length === 0 ? (
            <p>제공 물품이 없습니다.</p>
          ) : (
            <ul>
              {exchangeRequest.offeredItems.map((item) => (
                <li key={item.itemId}>
                  <img
                    src={
                      item.thumbnailImageUrl ||
                      '/icons/chat-image-placeholder.svg'
                    }
                    alt=""
                    width="32"
                    height="32"
                  />
                  <span>
                    {item.title} · {item.offeredQuantity}개 / 재고:{' '}
                    {item.availableQuantity}개
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {canEdit && (
        <div className={styles.exchangeActions}>
          <button
            type="button"
            disabled={isUpdatingExchange}
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
