import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './ActivityPageLayout.module.css'

type ActivityPageLayoutProps = {
  title: string
  backHref: string
  children: ReactNode
}

export default function ActivityPageLayout({
  title,
  backHref,
  children,
}: ActivityPageLayoutProps) {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <Link
          className={styles.backButton}
          href={backHref}
          aria-label="뒤로 가기"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m12 5-7 7 7 7M5 12h14" />
          </svg>
        </Link>
        <h1>{title}</h1>
        <span aria-hidden="true" />
      </header>
      {children}
    </section>
  )
}
