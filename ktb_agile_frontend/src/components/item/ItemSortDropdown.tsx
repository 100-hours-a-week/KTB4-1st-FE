'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './ItemSortDropdown.module.css'

type Props = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

const options = ['최신순', '추천순'] as const

export default function ItemSortDropdown({ isOpen, onOpenChange }: Props) {
  const [selected, setSelected] = useState<(typeof options)[number]>('최신순')
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
        aria-label={`정렬 방법: ${selected}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? optionsId : undefined}
        onClick={() => onOpenChange(!isOpen)}
      >
        {selected}
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
              key={option}
              type="button"
              className={styles.option}
              aria-pressed={selected === option}
              onClick={() => {
                setSelected(option)
                onOpenChange(false)
                triggerRef.current?.focus()
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
