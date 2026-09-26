export type ItemRegisterFormValues = {
  title: string
  content: string
  itemState: 'AVAILABLE' | 'COMPLETED'
  quantity: number | undefined
  groupIds: number[]
  pace: number
  condition: number
}

export type SelectedImage = {
  id: string
  file: File
  preview: string
  objectKey?: string
}

export type ItemState = 'AVAILABLE' | 'UNAVAILABLE'

export type ItemListItem = {
  itemId: number
  title: string
  contentPreview: string
  quantity: number
  owner: {
    userId: number
    nickname: string
  }
  itemState: ItemState
  thumbnailImageUrl: string | null
  likeCount: number
  exchangeRequestCount: number
  isLiked: boolean
  createdAt: string
}

export type ItemListResponse = {
  data: {
    items: ItemListItem[]
    nextCursor: string | null
    hasNext: boolean
  }
  error: null
}

export type MockItem = ItemListItem & {
  content: string
  exchangeUrgencyScore: number
  valueGapToleranceScore: number
  groupIds: number[]
  objectKeys: string[]
}
