'use client'

import ModalDefault from '@/components/common/modal/Default'
import { AI_FEATURE_IN_DEVELOPMENT_MESSAGE } from '@/constants/aiFeature'

type AiFeatureNoticeModalProps = {
  onClose: () => void
}

export default function AiFeatureNoticeModal({
  onClose,
}: AiFeatureNoticeModalProps) {
  return (
    <ModalDefault
      message={AI_FEATURE_IN_DEVELOPMENT_MESSAGE}
      onConfirm={onClose}
    />
  )
}
