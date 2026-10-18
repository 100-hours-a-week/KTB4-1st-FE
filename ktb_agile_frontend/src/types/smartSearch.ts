import type { ItemListItem } from './item'

export type SmartSearchRequest = {
  groupId: number
  items: { itemId: number; quantity: number }[]
  preferenceText?: string
}

export type SmartSearchResponse = {
  data: { items: ItemListItem[] } | null
  error: {
    code: string
    message: string
    details: { field: string; reason: string }[]
  } | null
}
