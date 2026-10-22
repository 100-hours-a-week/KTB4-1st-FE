'use client'

import { useEffect, useRef } from 'react'

const MAX_OFFSET = 96
const resistance = (distance: number) =>
  MAX_OFFSET * (1 - Math.exp(-Math.max(0, distance) / 200))

export function useElasticPull(enabled = true) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const content = contentRef.current
    if (!content || !enabled) return

    let start: { x: number; y: number } | null = null
    let isDragging = false
    let isMouseDown = false
    let suppressClick = false
    let clickTimer: ReturnType<typeof setTimeout> | undefined
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const move = (distance: number) => {
      content.style.transition = 'none'
      content.style.transform = `translateY(${resistance(distance)}px)`
    }
    const release = () => {
      start = null
      isDragging = false
      isMouseDown = false
      content.style.transition = reducedMotion
        ? 'none'
        : 'transform 420ms cubic-bezier(0.22, 1.3, 0.36, 1)'
      content.style.transform = 'translateY(0px)'
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        suppressClick = false
      }, 250)
    }
    const onStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || event.touches.length !== 1) return
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
      if (start || isDragging) release()
    }
    const onClick = (event: MouseEvent) => {
      if (!suppressClick || !content.contains(event.target as Node)) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || window.scrollY > 0) return
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
    content.addEventListener('touchcancel', onEnd)
    content.addEventListener('mousedown', onMouseDown)
    content.addEventListener('dragstart', preventNativeDrag)
    content.addEventListener('selectstart', preventNativeDrag)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('click', onClick, true)
    window.addEventListener('blur', onMouseUp)
    return () => {
      clearTimeout(clickTimer)
      content.removeEventListener('touchstart', onStart)
      content.removeEventListener('touchmove', onMove)
      content.removeEventListener('touchend', onEnd)
      content.removeEventListener('touchcancel', onEnd)
      content.removeEventListener('mousedown', onMouseDown)
      content.removeEventListener('dragstart', preventNativeDrag)
      content.removeEventListener('selectstart', preventNativeDrag)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('blur', onMouseUp)
      content.style.removeProperty('transition')
      content.style.removeProperty('transform')
    }
  }, [enabled])

  return contentRef
}
