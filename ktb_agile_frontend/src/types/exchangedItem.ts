import type { ItemState } from './item'

export type ExchangedItem = {
  itemId: number
  title: string
  owner: {
    userId: number
    nickname: string
  }
  quantity: number
  itemState: ItemState
  thumbnailImageUrl: string | null
}

export type ExchangeHistory = {
  exchangeRequestId: number
  exchangeStatus: string
  exchangedAt: string
  requestedItem: ExchangedItem
  offeredItems: ExchangedItem[]
}

export type ExchangedItemsResponse =
  | {
      data: {
        items: ExchangeHistory[]
        nextCursor: string | null
        hasNext: boolean
      }
      error: null
    }
  | {
      data: null
      error: {
        code: string
        message: string
        details: unknown[]
      }
    }
