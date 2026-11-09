import type { MessageRefineState } from '@/hooks/useMessageRefine'
import styles from './RefineResult.module.css'

type RefineResultProps = {
  state: MessageRefineState
  onApply: (refinedMessage: string) => void
}

export default function RefineResult({ state, onApply }: RefineResultProps) {
  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <p className={styles.error} role="alert">
        {state.message}
      </p>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className={styles.panel} role="status" aria-label="채팅 다듬는 중">
        <span className={styles.spinner} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <button
        className={styles.suggestion}
        type="button"
        onClick={() => onApply(state.refined)}
        aria-label={`다듬은 메시지 입력창에 넣기: ${state.refined}`}
      >
        {state.refined}
      </button>
    </div>
  )
}
