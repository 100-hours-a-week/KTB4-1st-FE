import styles from './Loading.module.css'

type LoadingProps = {
  fullScreen?: boolean
}

export default function Loading({ fullScreen = false }: LoadingProps) {
  return (
    <div
      className={`${styles.container}${fullScreen ? ` ${styles.fullScreen}` : ''}`}
      role="status"
      aria-label="로딩 중"
    >
      <span className={styles.spinner} aria-hidden="true" />
    </div>
  )
}
