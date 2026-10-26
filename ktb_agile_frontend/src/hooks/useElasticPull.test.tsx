import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useElasticPull } from './useElasticPull'

function List({
  enabled = true,
  onRefresh,
}: {
  enabled?: boolean
  onRefresh?: (signal: AbortSignal) => Promise<void>
}) {
  const {
    contentRef: ref,
    pullProgress,
    isRefreshing,
  } = useElasticPull(enabled, onRefresh)
  return (
    <div ref={ref} data-testid="list">
      <a href="/item">물품</a>
      {onRefresh && (
        <output data-testid="progress">
          {isRefreshing ? 'refreshing' : pullProgress}
        </output>
      )}
    </div>
  )
}

const touch = (clientY: number, clientX = 100) => ({
  touches: [{ clientX, clientY }],
})

it('스피너를 당긴 만큼 채우고 임계값 이후 놓으면 한 번만 조회하며 응답까지 유지한다', async () => {
  let finish!: () => void
  const onRefresh = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  render(<List onRefresh={onRefresh} />)
  const list = screen.getByTestId('list')
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(170))
  expect(screen.getByTestId('progress').textContent).toBe('0.5')
  expect(onRefresh).not.toHaveBeenCalled()
  fireEvent.touchMove(list, touch(240))
  expect(screen.getByTestId('progress').textContent).toBe('1')
  await act(async () => fireEvent.touchEnd(list))
  expect(onRefresh).toHaveBeenCalledTimes(1)
  expect(offset(list)).toBe(64)
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(300))
  fireEvent.touchEnd(list)
  await act(async () => vi.advanceTimersByTime(800))
  expect(screen.getByTestId('progress').textContent).toBe('refreshing')
  expect(onRefresh).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  expect(offset(list)).toBe(0)
  expect(screen.getByTestId('progress').textContent).toBe('0')
})

it('짧은 당김과 취소는 조회하지 않고 빠른 응답에도 한 바퀴를 유지한다', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined)
  render(<List onRefresh={onRefresh} />)
  const list = screen.getByTestId('list')
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(170))
  fireEvent.touchEnd(list)
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(300))
  fireEvent.touchCancel(list)
  expect(onRefresh).not.toHaveBeenCalled()
  fireEvent.mouseDown(list, { button: 0, clientX: 100, clientY: 100 })
  fireEvent.mouseMove(document, { buttons: 1, clientX: 100, clientY: 300 })
  await act(async () => fireEvent.mouseUp(document))
  await act(async () => vi.advanceTimersByTime(799))
  expect(screen.getByTestId('progress').textContent).toBe('refreshing')
  await act(async () => vi.advanceTimersByTime(1))
  expect(offset(list)).toBe(0)
})

it('조회 중 비활성화되면 요청을 취소하고 이후 응답으로 화면을 바꾸지 않는다', async () => {
  let finish!: () => void
  const onRefresh = vi.fn(
    (signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        expect(signal.aborted).toBe(false)
        finish = resolve
      }),
  )
  const { rerender } = render(<List onRefresh={onRefresh} />)
  const list = screen.getByTestId('list')
  fireEvent.touchStart(list, touch(100))
  fireEvent.touchMove(list, touch(300))
  await act(async () => fireEvent.touchEnd(list))
  const signal = onRefresh.mock.calls[0][0]
  rerender(<List onRefresh={onRefresh} enabled={false} />)
  expect(signal.aborted).toBe(true)
  await act(async () => finish())
  expect(list.style.transform).toBe('')
  expect(vi.getTimerCount()).toBe(0)
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
