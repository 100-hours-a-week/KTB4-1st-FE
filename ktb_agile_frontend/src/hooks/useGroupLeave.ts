'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import { GROUP_ERRORS } from '@/constants/errors/group'
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
  const [leaveError, setLeaveError] = useState<string | null>(null)

  function handleGroupLeave(group: GroupCardData) {
    setLeaveError(null)
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

  function dismissLeaveError() {
    setLeaveError(null)
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
    } catch (error) {
      console.error(error)
      const message = axios.isAxiosError<{ error?: { message?: string } }>(
        error,
      )
        ? error.response?.data?.error?.message
        : undefined
      setLeaveError(
        typeof message === 'string' && message.trim()
          ? message
          : GROUP_ERRORS.LEAVE_FAILED,
      )
      setLeaveModalStep(null)
      setLeaveTarget(null)
      return
    } finally {
      setIsLeaving(false)
    }
    onSuccess(leaveTarget)
  }

  return {
    leaveTarget,
    leaveModalStep,
    isLeaving,
    leaveError,
    dismissLeaveError,
    handleGroupLeave,
    cancelGroupLeave,
    proceedGroupLeave,
    confirmGroupLeave,
  }
}
