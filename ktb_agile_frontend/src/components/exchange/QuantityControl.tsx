'use client'

import styles from './ExchangeForm.module.css'

export default function QuantityControl({
  value,
  maximum,
  disabled = false,
  onChange,
}: {
  value: number
  maximum: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className={styles.quantity}>
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        −
      </button>
      <span>{value}</span>
      <button
        type="button"
        disabled={disabled || value >= maximum}
        onClick={() => onChange(Math.min(maximum, value + 1))}
      >
        +
      </button>
    </div>
  )
}
