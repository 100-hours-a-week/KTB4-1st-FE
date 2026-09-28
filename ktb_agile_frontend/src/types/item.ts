export type ItemState = 'AVAILABLE' | 'UNAVAILABLE'

export type ItemRegisterFormValues = {
  title: string
  content: string
  itemState: ItemState
  quantity: number | undefined
  groupIds: number[]
  pace: number
  condition: number
}

export type SelectedImage = {
  id: string
  file?: File
  imageId?: number
  preview: string
  objectKey?: string
}

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

export type ItemDetail = {
  itemId: number
  groups: {
    groupId: number
    groupName: string
  }[]
  title: string
  content: string
  quantity: number
  itemState: ItemState
  exchangeUrgencyScore: number
  valueGapToleranceScore: number
  owner: {
    userId: number
    nickname: string
    profileImageUrl: string | null
  }
  images: {
    imageId: number
    imageUrl: string
    displayOrder: number
  }[]
  likeCount: number
  viewCount: number
  exchangeRequestCount: number
  isLiked: boolean
  createdAt: string
  updatedAt: string
}

export type ItemDetailResponse = {
  data: ItemDetail
  error: null
}
