'use client'

import styles from './ItemAvailableFilterButton.module.css'

type Props = {
  pressed: boolean
  onToggle: (pressed: boolean) => void
}

export default function ItemAvailableFilterButton({
  pressed,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={pressed}
      onClick={() => onToggle(!pressed)}
    >
      거래 가능한 상품만 보기
    </button>
  )
}
