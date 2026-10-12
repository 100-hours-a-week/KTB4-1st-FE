export type SearchHistory = {
  searchHistoryId: number
  keyword: string
  lastSearchedAt: string
  createdAt: string
}

export type SearchHistoryResponse = {
  data: {
    searchHistories: SearchHistory[]
    nextCursor: string | null
    hasNext: boolean
  }
  error: null
}
