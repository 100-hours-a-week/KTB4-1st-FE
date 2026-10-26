import styles from './Loading.module.css'

type LoadingProps = {
  fullScreen?: boolean
  progress?: number
}

export default function Loading({
  fullScreen = false,
  progress,
}: LoadingProps) {
  return (
    <div
      className={`${styles.container}${fullScreen ? ` ${styles.fullScreen}` : ''}`}
      role="status"
      aria-label={progress === undefined ? '로딩 중' : '당겨서 새로고침'}
    >
      {progress === undefined ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <svg className={styles.progress} viewBox="0 0 40 40" aria-hidden="true">
          <circle className={styles.track} cx="20" cy="20" r="18" />
          <circle
            className={styles.arc}
            cx="20"
            cy="20"
            r="18"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - Math.min(1, Math.max(0, progress))}
          />
        </svg>
      )}
    </div>
  )
}
