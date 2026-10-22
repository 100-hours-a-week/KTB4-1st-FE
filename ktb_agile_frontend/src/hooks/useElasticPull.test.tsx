import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useElasticPull } from './useElasticPull'

function List({ enabled = true }: { enabled?: boolean }) {
  const ref = useElasticPull(enabled)
  return (
    <div ref={ref} data-testid="list">
      <a href="/item">물품</a>
    </div>
  )
}

const touch = (clientY: number, clientX = 100) => ({
  touches: [{ clientX, clientY }],
})
const offset = (element: HTMLElement) =>
  Number(element.style.transform.match(/translateY\(([^p]+)px\)/)?.[1] ?? 0)

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('당길수록 이동량의 증가가 줄고 손을 놓으면 원위치로 돌아간다', () => {
  render(<List />)
  const list = screen.getByTestId('list')
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(200))
  const first = offset(list)
  fireEvent.touchMove(list, touch(300))
  const second = offset(list)
  expect(first).toBeGreaterThan(0)
  expect(second).toBeGreaterThan(first)
  expect(second - first).toBeLessThan(first)
  fireEvent.touchMove(list, touch(10000))
  expect(offset(list)).toBeLessThanOrEqual(96)
  fireEvent.touchEnd(list)
  expect(offset(list)).toBe(0)
  expect(list.style.transition).toContain('420ms')
  // 당김 직후 물품 상세 페이지로 잘못 이동하지 않습니다.
  expect(fireEvent.click(screen.getByText('물품'))).toBe(false)
})

it('최상단이 아니거나 가로로 움직이면 목록을 당기지 않는다', () => {
  render(<List />)
  const list = screen.getByTestId('list')
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 })
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(300))
  expect(offset(list)).toBe(0)
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(110, 200))
  expect(offset(list)).toBe(0)
})

it('터치 취소 시 복귀하고 비활성화하면 스타일과 타이머를 정리한다', () => {
  const { rerender } = render(<List />)
  const list = screen.getByTestId('list')
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(200))
  fireEvent.touchCancel(list)
  expect(offset(list)).toBe(0)
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(200))
  expect(offset(list)).toBeGreaterThan(0)
  rerender(<List enabled={false} />)
  expect(list.style.transform).toBe('')
  expect(vi.getTimerCount()).toBe(0)
})

it('최상단의 일반 휠 및 트랙패드 스크롤에는 탄성 효과를 적용하지 않는다', () => {
  render(<List />)
  const list = screen.getByTestId('list')
  fireEvent.wheel(list, { deltaY: -100, ctrlKey: true })
  expect(offset(list)).toBe(0)
  fireEvent.wheel(list, { deltaY: -100 })
  fireEvent.wheel(list, { deltaY: -100, deltaMode: 1 })
  expect(offset(list)).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})

it('마우스로 물품을 아래로 당기고 목록 밖에서 놓아도 복귀하고 클릭 이동을 막는다', () => {
  render(<List />)
  const list = screen.getByTestId('list')
  const link = screen.getByText('물품')
  fireEvent.mouseDown(link, { button: 0, clientX: 100, clientY: 100 })
  expect(fireEvent.dragStart(link)).toBe(false)
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 200 })
  expect(offset(list)).toBeGreaterThan(0)
  fireEvent.mouseUp(document)
  expect(offset(list)).toBe(0)
  expect(fireEvent.click(link)).toBe(false)
})

it('마우스 단순 클릭과 우클릭에는 탄성을 적용하지 않고 창 포커스를 잃으면 복귀한다', () => {
  render(<List />)
  const list = screen.getByTestId('list')
  fireEvent.mouseDown(list, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseUp(document)
  expect(fireEvent.click(list)).toBe(true)
  fireEvent.mouseDown(list, { button: 2, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 2, clientX: 100, clientY: 200 })
  expect(offset(list)).toBe(0)
  fireEvent.mouseDown(list, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 200 })
  expect(offset(list)).toBeGreaterThan(0)
  fireEvent.blur(window)
  expect(offset(list)).toBe(0)
})
