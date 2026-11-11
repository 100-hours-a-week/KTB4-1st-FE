export type ItemState = 'AVAILABLE' | 'UNAVAILABLE'
export type ItemSort = 'latest' | 'recommended'

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
  webpFile?: File
  imageId?: number
  preview: string
  thumbnailObjectKey?: string
  detailThumbnailObjectKey?: string
  objectKey?: string
}

export type ItemDetailThumbnailInput = {
  objectKey: string
  detailThumbnailObjectKey: string
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
  /** 상세 화면 첫 사진의 상세용 썸네일 주소. 상세 썸네일이 없으면 원본 주소입니다. */
  detailThumbnailImageUrl?: string | null
  likeCount: number
  viewCount: number
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

export type MyItemListItem = Omit<ItemListItem, 'owner' | 'viewCount'> & {
  groups: { groupId: number; groupName: string }[]
}

/** 교환 요청에 내 물품으로 내놓을 수 있는 물품 정보 */
export type OfferableItem = Pick<
  ItemListItem,
  'itemId' | 'title' | 'thumbnailImageUrl' | 'quantity' | 'itemState'
> & {
  groups: { groupId: number; groupName: string }[]
}

export type MyItemListResponse = {
  data: {
    items: MyItemListItem[]
    nextCursor: string | null
    hasNext: boolean
  } | null
  error: { code: string; message: string; details: unknown[] } | null
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
  thumbnailImageId?: number | null
  images: {
    imageId: number
    imageUrl: string
    detailThumbnailUrl?: string | null
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
