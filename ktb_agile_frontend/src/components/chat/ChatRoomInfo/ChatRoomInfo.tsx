import ChatExchangeActions from './ChatExchangeActions'
import { CHAT_ROOM_STATUS, CHAT_EXCHANGE_STATUS_LABEL } from '@/constants/chat'
import { EXCHANGE_STATUS } from '@/constants/exchange'
import styles from './ChatRoomInfo.module.css'
import type {
  ChatRoom,
  ChatRoomDetail,
  ExchangeActionStatus,
} from '@/types/chatRoom'

type ChatRoomInfoProps = Pick<ChatRoom, 'chatRoomStatus'> &
  Pick<ChatRoomDetail, 'exchangeRequest'> & {
    group: NonNullable<ChatRoom['group']>['groupName']
    otherUser: ChatRoom['otherUser']['nickname']
    direction: ChatRoom['direction'] | null
    itemAvailable: boolean | null
    isUpdatingExchange: boolean
    returnTo: string
    onUpdateExchange: (status: ExchangeActionStatus) => void
    onEditExchange: (
      itemId: ChatRoomDetail['exchangeRequest']['requestedItem']['itemId'],
      exchangeRequestId: ChatRoom['exchangeRequestId'],
      returnTo: string,
    ) => void
  }

export default function ChatRoomInfo({
  group,
  otherUser,
  direction,
  chatRoomStatus,
  exchangeRequest,
  itemAvailable,
  isUpdatingExchange,
  returnTo,
  onUpdateExchange,
  onEditExchange,
}: ChatRoomInfoProps) {
  const { requestedItem, exchangeRequestId } = exchangeRequest
  const { title, itemId, thumbnailImageUrl: image } = requestedItem
  const roomTitle = `${title} <- ${exchangeRequest.offeredItems.map((item) => item.title).join(', ') || '제공 물품 없음'}`
  const isSeller = direction === 'RECEIVED'
  const isRequester = direction === 'SENT'
  const exchangeStatus =
    chatRoomStatus === CHAT_ROOM_STATUS.CLOSED
      ? CHAT_ROOM_STATUS.CLOSED
      : exchangeRequest.exchangeStatus
  const canEdit =
    isRequester &&
    exchangeStatus === EXCHANGE_STATUS.PENDING &&
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
          <strong title={roomTitle}>{roomTitle}</strong>
          <span>
            {exchangeStatus === EXCHANGE_STATUS.PENDING &&
            itemAvailable === false
              ? '재고 부족'
              : CHAT_EXCHANGE_STATUS_LABEL[exchangeStatus]}
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
          isSeller &&
          exchangeStatus === EXCHANGE_STATUS.PENDING &&
          itemAvailable === true
        }
        exchangeRequestId={exchangeRequestId}
        isUpdating={isUpdatingExchange}
        onUpdate={onUpdateExchange}
      />
    </article>
  )
}
