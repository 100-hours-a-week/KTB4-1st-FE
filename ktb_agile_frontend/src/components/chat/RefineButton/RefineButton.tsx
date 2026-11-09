import styles from './RefineButton.module.css'

type RefineButtonProps = {
  disabled?: boolean
  isLoading?: boolean
  onClick: () => void
}

export default function RefineButton({
  disabled = false,
  isLoading = false,
  onClick,
}: RefineButtonProps) {
  return (
    <button
      className={styles.button}
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      다듬기
    </button>
  )
}
