import type { ItemState } from '@/types/item'

export function getItemStateLabel(itemState: ItemState) {
  return itemState === 'AVAILABLE' ? '거래 가능' : '거래 완료'
}
