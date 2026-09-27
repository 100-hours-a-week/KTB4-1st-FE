'use client'

import styles from './ExchangeForm.module.css'

export default function ItemImage({ url }: { url?: string | null }) {
  return (
    <div
      className={styles.image}
      style={
        url
          ? { backgroundImage: `url("${url.replaceAll('"', '%22')}")` }
          : undefined
      }
    >
      {!url && (
        <svg viewBox="0 0 24 24">
          <rect x="3.5" y="4" width="17" height="16" rx="2" />
          <circle cx="9" cy="9.5" r="1.5" />
          <path d="m5 17 4.2-4.2 3.2 3.2 2.1-2.1L19 18.4" />
        </svg>
      )}
    </div>
  )
}
