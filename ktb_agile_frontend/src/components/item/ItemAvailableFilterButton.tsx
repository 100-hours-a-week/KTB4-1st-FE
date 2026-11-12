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
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        {pressed ? (
          <path d="m3.5 8.5 3 3 6-7" />
        ) : (
          <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="2.5" />
        )}
      </svg>
      거래 가능한 상품만 보기
    </button>
  )
}
