'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import type { GroupCardData } from '@/types/group'
import { getAccessTokenOrRedirect } from '@/utils/auth'

type UseGroupLeaveOptions = {
  onSuccess: (group: GroupCardData) => void
}

export function useGroupLeave({ onSuccess }: UseGroupLeaveOptions) {
  const router = useRouter()
  const [leaveTarget, setLeaveTarget] = useState<GroupCardData | null>(null)
  const [leaveModalStep, setLeaveModalStep] = useState<1 | 2 | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  function handleGroupLeave(group: GroupCardData) {
    setLeaveTarget(group)
    setLeaveModalStep(1)
  }

  function cancelGroupLeave() {
    if (isLeaving) return
    setLeaveModalStep(null)
    setLeaveTarget(null)
  }

  function proceedGroupLeave() {
    setLeaveModalStep(2)
  }

  async function confirmGroupLeave() {
    if (!leaveTarget || isLeaving) return

    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    setIsLeaving(true)
    try {
      await axios.delete(
        `${API_BASE_URL}/groups/${leaveTarget.groupId}/members/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      )
      setLeaveModalStep(null)
      setLeaveTarget(null)
      onSuccess(leaveTarget)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLeaving(false)
    }
  }

  return {
    leaveTarget,
    leaveModalStep,
    isLeaving,
    handleGroupLeave,
    cancelGroupLeave,
    proceedGroupLeave,
    confirmGroupLeave,
  }
}
