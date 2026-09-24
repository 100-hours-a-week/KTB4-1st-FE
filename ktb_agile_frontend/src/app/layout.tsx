import type { Metadata } from 'next'
import './layout.css'

export const metadata: Metadata = {
  title: '바꾸까',
  description: '생활권 물물교환 서비스',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <main className="app-content">{children}</main>
        </div>
      </body>
    </html>
  )
}
