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

type LocationVerificationResponse = {
  data: { verified: boolean; failureReason: string | null } | null
  error: { message: string } | null
}

class LocationError extends Error {
  constructor(
    message: string,
    readonly canRetry = true,
  ) {
    super(message)
  }
}

function getCurrentLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationError(GROUP_ERRORS.LOCATION_UNSUPPORTED, false))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      (error) => {
        const message =
          error.code === 1
            ? `${GROUP_ERRORS.LOCATION_DENIED}\n\n${GROUP_ERRORS.LOCATION_PERMISSION_HELP}`
            : error.code === 3
              ? GROUP_ERRORS.LOCATION_TIMEOUT
              : GROUP_ERRORS.LOCATION_UNAVAILABLE
        reject(new LocationError(message))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}

export default function GroupJoinModal({
  group,
  onCancel,
  onJoined,
}: GroupJoinModalProps) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<{
    message: string
    canRetry: boolean
  } | null>(null)

  function closeError() {
    setJoinError(null)
    onCancel()
  }

  async function confirmJoin() {
    if (!group || isJoining) return
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    setIsJoining(true)
    try {
      const { latitude, longitude, accuracy } = await getCurrentLocation()
      console.log('현재 위치', { latitude, longitude, accuracy })

      const config = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }

      const verification = await axios.post<LocationVerificationResponse>(
        `${API_BASE_URL}/groups/${group.groupId}/location-verifications`,
        { latitude, longitude, accuracy },
        config,
      )

      if (
        verification.status !== 200 ||
        verification.data?.error ||
        verification.data?.data?.verified !== true
      ) {
        const result = verification.data?.data
        const failureReason =
          verification.status === 200 && result?.verified === false
            ? result.failureReason
            : null
        const message =
          failureReason === 'ACCURACY_TOO_LOW'
            ? GROUP_ERRORS.ACCURACY_TOO_LOW
            : failureReason === 'DISTANCE_TOO_FAR'
              ? GROUP_ERRORS.DISTANCE_TOO_FAR
              : null
        setJoinError({
          message:
            verification.data?.error?.message ||
            message ||
            GROUP_ERRORS.JOIN_FAILED,
          canRetry: message !== null,
        })
        return
      }

      await axios.post(
        `${API_BASE_URL}/groups/${group.groupId}/members`,
        undefined,
        config,
      )
      onJoined({ ...group, isJoined: true, memberCount: group.memberCount + 1 })
    } catch (error) {
      console.error(error)
      setJoinError({
        message: axios.isAxiosError<{ error?: { message?: string } }>(error)
          ? error.response?.data?.error?.message || GROUP_ERRORS.JOIN_FAILED
          : error instanceof Error
            ? error.message
            : GROUP_ERRORS.JOIN_FAILED,
        canRetry: error instanceof LocationError && error.canRetry,
      })
    } finally {
      setIsJoining(false)
    }
  }

  if (joinError)
    return (
      <ModalDefault
        message={joinError.message}
        confirmLabel={joinError.canRetry ? '다시 시도' : '확인'}
        onConfirm={
          joinError.canRetry
            ? () => {
                setJoinError(null)
                void confirmJoin()
              }
            : closeError
        }
        onCancel={joinError.canRetry ? closeError : undefined}
        cancelLabel="닫기"
        confirmDisabled={isJoining}
        cancelDisabled={isJoining}
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
