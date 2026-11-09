'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  getRefineErrorMessage,
  MESSAGE_REFINE_MAX_LENGTH,
  refineMessage,
} from '@/api/messageRefine'
import { MESSAGE_REFINE_ERRORS } from '@/constants/errors/messageRefine'
import { getAccessTokenOrRedirect } from '@/utils/auth'

export type MessageRefineState =
  | { status: 'idle' }
  | { status: 'loading'; source: string }
  | { status: 'done'; source: string; refined: string }
  | { status: 'error'; source: string; message: string }

export function useMessageRefine(message: string) {
  const router = useRouter()
  const [state, setState] = useState<MessageRefineState>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)
  const source = message.trim()

  useEffect(() => () => controllerRef.current?.abort(), [])

  // 다듬기 결과는 요청했던 원문이 그대로일 때만 보여줍니다.
  const visibleState: MessageRefineState =
    state.status !== 'idle' && state.source === source
      ? state
      : { status: 'idle' }

  async function refine() {
    if (!source || visibleState.status === 'loading') return
    if (source.length > MESSAGE_REFINE_MAX_LENGTH) {
      setState({
        status: 'error',
        source,
        message: MESSAGE_REFINE_ERRORS.MESSAGE_TOO_LONG,
      })
      return
    }
    const accessToken = getAccessTokenOrRedirect(router)
    if (!accessToken) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ status: 'loading', source })
    try {
      const refined = await refineMessage({
        accessToken,
        message: source,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setState({ status: 'done', source, refined })
    } catch (cause) {
      if (controller.signal.aborted) return
      setState({
        status: 'error',
        source,
        message: getRefineErrorMessage(cause),
      })
    }
  }

  function reset() {
    controllerRef.current?.abort()
    setState({ status: 'idle' })
  }

  return { state: visibleState, refine, reset }
}
