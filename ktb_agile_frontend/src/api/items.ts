import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import type { ItemListResponse, ItemSort, ItemState } from '@/types/item'

type FetchItemsParams = {
  groupId: number
  sort?: ItemSort
  /** 지정하면 해당 거래 상태의 물품만 조회합니다. 생략하면 모든 상태를 조회합니다. */
  itemState?: ItemState | null
  cursor?: string
  size?: number
  accessToken: string
  signal?: AbortSignal
}

export async function fetchItems({
  groupId,
  sort = 'latest',
  itemState,
  cursor,
  size = 20,
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
      ...(itemState ? { itemState } : {}),
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
