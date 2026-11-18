'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import AiFeatureNoticeModal from '@/components/common/modal/AiFeatureNoticeModal'
import { AI_FEATURES_ENABLED } from '@/constants/aiFeature'

const FALLBACK_PATH = '/pages/items'

// URL로 AI 기능 화면에 직접 들어온 경우에도 개발 중 안내만 보여주고 되돌려 보낸다.
export default function AiFeatureGuard({ children }: { children: ReactNode }) {
  const router = useRouter()

  if (AI_FEATURES_ENABLED) return children

  return <AiFeatureNoticeModal onClose={() => router.replace(FALLBACK_PATH)} />
}
