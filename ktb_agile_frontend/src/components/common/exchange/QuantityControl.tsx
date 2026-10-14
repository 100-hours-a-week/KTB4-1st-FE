'use client'

import styles from './QuantityControl.module.css'

export default function QuantityControl({
  value,
  maximum,
  disabled = false,
  variant,
  onChange,
}: {
  value: number
  maximum: number
  disabled?: boolean
  variant?: 'requestTarget' | 'requestOffer'
  onChange: (value: number) => void
}) {
  return (
    <div className={`${styles.quantity} ${variant ? styles[variant] : ''}`}>
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
