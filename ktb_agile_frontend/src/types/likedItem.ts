import type { ItemState } from './item'

export type LikedItemGroup = {
  groupId: number
  groupName: string
}

export type LikedItem = {
  itemId: number
  groups: LikedItemGroup[]
  title: string
  contentPreview: string
  quantity: number
  itemState: ItemState
  thumbnailImageUrl: string | null
  likeCount: number
  exchangeRequestCount: number
  isLiked: boolean
  createdAt: string
}

export type LikedItemsPage = {
  items: LikedItem[]
  nextCursor: string | null
  hasNext: boolean
}

export type LikedItemsResponse =
  | { data: LikedItemsPage; error: null }
  | {
      data: null
      error: {
        code: string
        message: string
        details: unknown[]
      }
    }
