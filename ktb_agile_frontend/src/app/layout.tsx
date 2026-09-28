import type { Metadata } from 'next'
import './layout.css'
import Script from 'next/script'


export const metadata: Metadata = {
  title: '바꾸까',
  description: '생활권 물물교환 서비스',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    
    <html lang="ko">
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
          <main className="app-content">{children}</main>
        </div>
      </body>
    </html>
  )
}
