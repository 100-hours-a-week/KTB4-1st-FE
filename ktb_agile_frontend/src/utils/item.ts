import type { ItemState } from '@/types/item'

export function getItemStateLabel(itemState: ItemState) {
  return itemState === 'AVAILABLE' ? '거래 가능' : '거래 완료'
}

/** 교환에 내놓을 수 있는 물품인지 확인합니다. */
export function isItemAvailable(item: {
  itemState: ItemState
  quantity: number
}) {
  return item.itemState === 'AVAILABLE' && item.quantity >= 1
}
