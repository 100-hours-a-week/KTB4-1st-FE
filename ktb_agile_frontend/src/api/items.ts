import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import type { ItemListResponse, ItemSort } from '@/types/item'

type FetchItemsParams = {
  groupId: number
  sort?: ItemSort
  cursor?: string
  size?: number
  accessToken: string
  signal?: AbortSignal
}

export async function fetchItems({
  groupId,
  sort = 'latest',
  cursor,
  size = 10,
  accessToken,
  signal,
}: FetchItemsParams) {
  const isRecommended = sort === 'recommended'
  const path = isRecommended
    ? '/items/recommendations'
    : `/groups/${groupId}/items`
  const response = await axios.get<ItemListResponse>(`${API_BASE_URL}${path}`, {
    params: {
      ...(isRecommended ? { groupId } : {}),
      size,
      ...(cursor ? { cursor } : {}),
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    signal,
  })
  return response.data.data
}
