import type { MouseEventHandler } from 'react'
import styles from './FloatingInquiryButton.module.css'

type FloatingInquiryButtonProps = {
  aboveComposer?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export default function FloatingInquiryButton({
  aboveComposer = false,
  onClick,
}: FloatingInquiryButtonProps) {
  return (
    <div
      className={`${styles.container} ${aboveComposer ? styles.aboveComposer : ''}`}
    >
      <button className={styles.button} type="button" onClick={onClick}>
        문의
      </button>
    </div>
  )
}
