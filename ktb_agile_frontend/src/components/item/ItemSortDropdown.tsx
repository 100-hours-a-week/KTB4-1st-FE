'use client'

import { useEffect, useId, useRef } from 'react'
import type { ItemSort } from '@/types/item'
import styles from './ItemSortDropdown.module.css'

type Props = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  value: ItemSort
  onChange: (sort: ItemSort) => void
}

const options = [
  { value: 'latest', label: '최신순' },
  { value: 'recommended', label: '추천순' },
] as const

export default function ItemSortDropdown({
  isOpen,
  onOpenChange,
  value,
  onChange,
}: Props) {
  const selectedLabel = options.find((option) => option.value === value)?.label
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionsId = useId()

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen, onOpenChange])

  return (
    <div
      className={styles.dropdown}
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false)
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`정렬 방법: ${selectedLabel}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? optionsId : undefined}
        onClick={() => onOpenChange(!isOpen)}
      >
        {selectedLabel}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="m4 6 4-4 4 4M4 10l4 4 4-4" />
        </svg>
      </button>
      {isOpen && (
        <div
          id={optionsId}
          className={styles.options}
          role="group"
          aria-label="정렬 방법"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.option}
              aria-pressed={value === option.value}
              onClick={() => {
                onChange(option.value)
                onOpenChange(false)
                triggerRef.current?.focus()
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
