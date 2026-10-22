'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_OFFSET = 96
const REFRESH_DISTANCE = 140
const resistance = (distance: number) =>
  MAX_OFFSET * (1 - Math.exp(-Math.max(0, distance) / 200))

export function useElasticPull(
  enabled = true,
  onRefresh?: (signal: AbortSignal) => Promise<void>,
) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pullProgress, setPullProgress] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const content = contentRef.current
    if (!content || !enabled) return

    let start: { x: number; y: number } | null = null
    let isDragging = false
    let isMouseDown = false
    let suppressClick = false
    let clickTimer: ReturnType<typeof setTimeout> | undefined
    let rotationTimer: ReturnType<typeof setTimeout> | undefined
    let finishRotation: (() => void) | undefined
    let pullDistance = 0
    let refreshController: AbortController | undefined
    let active = true
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const move = (distance: number) => {
      pullDistance = Math.max(0, distance)
      setPullProgress(Math.min(1, pullDistance / REFRESH_DISTANCE))
      content.style.transition = 'none'
      content.style.transform = `translateY(${resistance(distance)}px)`
    }
    const release = (canRefresh = false) => {
      start = null
      isDragging = false
      isMouseDown = false
      content.style.transition = reducedMotion
        ? 'none'
        : 'transform 420ms cubic-bezier(0.22, 1.3, 0.36, 1)'
      const shouldRefresh =
        canRefresh && pullDistance >= REFRESH_DISTANCE && onRefresh
      pullDistance = 0
      content.style.transform = shouldRefresh
        ? 'translateY(64px)'
        : 'translateY(0px)'
      if (shouldRefresh && !refreshController) {
        const controller = new AbortController()
        refreshController = controller
        setIsRefreshing(true)
        // 빠른 응답에도 최소 한 바퀴를 표시하고, 느린 응답은 완료까지 기다립니다.
        const rotation = new Promise<void>((resolve) => {
          finishRotation = resolve
          rotationTimer = setTimeout(resolve, 800)
        })
        void Promise.allSettled([
          Promise.resolve().then(() => onRefresh(controller.signal)),
          rotation,
        ]).then(() => {
          if (!active || controller.signal.aborted) return
          refreshController = undefined
          setIsRefreshing(false)
          setPullProgress(0)
          content.style.transform = 'translateY(0px)'
        })
      } else {
        setPullProgress(0)
      }
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        suppressClick = false
      }, 250)
    }
    const onStart = (event: TouchEvent) => {
      if (refreshController || window.scrollY > 0 || event.touches.length !== 1)
        return
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY }
      isDragging = false
    }
    const onMove = (event: TouchEvent) => {
      if (!start) return
      if (event.touches.length !== 1 || window.scrollY > 0) {
        release()
        return
      }
      const touch = event.touches[0]
      const distance = touch.clientY - start.y
      if (!isDragging) {
        if (
          Math.abs(touch.clientX - start.x) > Math.abs(distance) ||
          distance < 0
        ) {
          start = null
          return
        }
        if (distance < 6) return
        isDragging = true
        suppressClick = true
      }
      if (event.cancelable) event.preventDefault()
      move(distance)
    }
    const onEnd = () => {
      if (start || isDragging) release(true)
    }
    const onCancel = () => {
      if (start || isDragging) release()
    }
    const onClick = (event: MouseEvent) => {
      if (!suppressClick || !content.contains(event.target as Node)) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onMouseDown = (event: MouseEvent) => {
      if (refreshController || event.button !== 0 || window.scrollY > 0) return
      if (
        (event.target as Element).closest(
          'button, input, textarea, select, [contenteditable]',
        )
      )
        return
      start = { x: event.clientX, y: event.clientY }
      isMouseDown = true
      isDragging = false
    }
    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown || !start) return
      if (event.buttons !== 1 || window.scrollY > 0) {
        release()
        return
      }
      const distance = event.clientY - start.y
      if (!isDragging) {
        if (
          distance < 0 ||
          Math.abs(event.clientX - start.x) > Math.abs(distance)
        ) {
          start = null
          isMouseDown = false
          return
        }
        if (distance < 6) return
        isDragging = true
        suppressClick = true
      }
      event.preventDefault()
      move(distance)
    }
    const onMouseUp = () => {
      if (isMouseDown) onEnd()
    }
    const preventNativeDrag = (event: Event) => {
      if (isMouseDown) event.preventDefault()
    }
    content.addEventListener('touchstart', onStart, { passive: true })
    content.addEventListener('touchmove', onMove, { passive: false })
    content.addEventListener('touchend', onEnd)
    content.addEventListener('touchcancel', onCancel)
    content.addEventListener('mousedown', onMouseDown)
    content.addEventListener('dragstart', preventNativeDrag)
    content.addEventListener('selectstart', preventNativeDrag)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('click', onClick, true)
    window.addEventListener('blur', onCancel)
    return () => {
      active = false
      refreshController?.abort()
      clearTimeout(rotationTimer)
      finishRotation?.()
      setPullProgress(0)
      setIsRefreshing(false)
      clearTimeout(clickTimer)
      content.removeEventListener('touchstart', onStart)
      content.removeEventListener('touchmove', onMove)
      content.removeEventListener('touchend', onEnd)
      content.removeEventListener('touchcancel', onCancel)
      content.removeEventListener('mousedown', onMouseDown)
      content.removeEventListener('dragstart', preventNativeDrag)
      content.removeEventListener('selectstart', preventNativeDrag)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('blur', onCancel)
      content.style.removeProperty('transition')
      content.style.removeProperty('transform')
    }
  }, [enabled, onRefresh])

  return { contentRef, pullProgress, isRefreshing }
}
