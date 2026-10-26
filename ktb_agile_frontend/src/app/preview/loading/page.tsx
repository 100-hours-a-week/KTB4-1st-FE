import type { Metadata } from 'next'
import Loading from '@/components/common/Loading'

export const metadata: Metadata = {
  title: '로딩 미리보기',
  robots: { index: false, follow: false },
}

export default function LoadingPreviewPage() {
  return <Loading fullScreen />
}
