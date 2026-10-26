import type { Metadata } from 'next'
import './layout.css'
import './halloween-ui.css'
import Script from 'next/script'
import QueryProvider from './QueryProvider'
import AuthExpiredModal from '@/components/auth/AuthExpiredModal'

export const metadata: Metadata = {
  title: '바꾸까',
  description: '생활권 물물교환 서비스',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" data-theme="halloween">
      <body>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "yp87wogmb1");
          `}
        </Script>
        <div className="app-shell">
          <main className="app-content">
            <QueryProvider>
              <AuthExpiredModal>{children}</AuthExpiredModal>
            </QueryProvider>
          </main>
        </div>
      </body>
    </html>
  )
}
