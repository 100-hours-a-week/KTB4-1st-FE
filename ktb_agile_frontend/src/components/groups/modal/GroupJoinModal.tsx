'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import ModalDefault from '@/components/common/modal/Default'
import { API_BASE_URL } from '@/config/api'
import { GROUP_ERRORS } from '@/constants/errors/group'
import { JOIN_CONFIRM_MSG } from '@/constants/group'
import { getAccessTokenOrRedirect } from '@/utils/auth'
import type { GroupCardData } from '@/types/group'

type GroupJoinModalProps = {
  group: GroupCardData | null
  onCancel: () => void
  onJoined: (group: GroupCardData) => void
}

export default function GroupJoinModal({
  group,
  onCancel,
  onJoined,
}: GroupJoinModalProps) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(false)
  const [hasError, setHasError] = useState(false)

  async function confirmJoin() {
    if (!group || isJoining) return
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    setIsJoining(true)
    try {
      await axios.post(
        `${API_BASE_URL}/groups/${group.groupId}/members`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      )
      onJoined({ ...group, isJoined: true, memberCount: group.memberCount + 1 })
    } catch (error) {
      console.error(error)
      onCancel()
      setHasError(true)
    } finally {
      setIsJoining(false)
    }
  }

  if (hasError)
    return (
      <ModalDefault
        message={GROUP_ERRORS.JOIN_FAILED}
        onConfirm={() => setHasError(false)}
      />
    )
  if (!group) return null

  return (
    <ModalDefault
      message={JOIN_CONFIRM_MSG}
      onConfirm={confirmJoin}
      onCancel={onCancel}
      confirmDisabled={isJoining}
      cancelDisabled={isJoining}
    />
  )
}
