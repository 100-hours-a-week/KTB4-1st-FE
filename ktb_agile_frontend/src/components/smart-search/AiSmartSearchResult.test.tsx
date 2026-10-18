import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ItemListItem } from '@/types/item'
import AiSmartSearchResult from './AiSmartSearchResult'
import SmartSearchProvider, { useSmartSearch } from './SmartSearchProvider'

const router = { back: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/components/common/navbar/Navbar', () => ({ default: () => null }))
vi.mock('@/components/item/ItemCardList', () => ({
  default: ({ items }: { items: { itemId: number; title: string }[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.itemId}>{item.title}</li>
      ))}
    </ul>
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// 검색 화면이 Provider에 값을 채워 넣는 상황을 흉내 낸다.
function SearchDone({ results }: { results: Partial<ItemListItem>[] }) {
  const { setItems, setPreferenceText, setResults } = useSmartSearch()

  return (
    <button
      type="button"
      onClick={() => {
        setItems([{ itemId: 101, quantity: 2 }])
        setPreferenceText('야식으로 먹을 거 찾아요')
        setResults(results as ItemListItem[])
      }}
    >
      검색 완료
    </button>
  )
}

function renderResult(results: Partial<ItemListItem>[]) {
  render(
    <SmartSearchProvider>
      <SearchDone results={results} />
      <AiSmartSearchResult />
    </SmartSearchProvider>,
  )
}

it('검색 결과가 없는 상태로 들어오면 검색 화면으로 돌려보낸다', async () => {
  renderResult([])

  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith('/pages/search/ai-smart-search'),
  )
  expect(screen.queryByText('스마트 검색 결과')).toBeNull()
})

it('저장된 검색 조건과 결과 물품을 보여준다', async () => {
  renderResult([{ itemId: 202, title: '과자 세트' }])

  fireEvent.click(screen.getByRole('button', { name: '검색 완료' }))

  expect(await screen.findByText('과자 세트')).toBeTruthy()
  expect(screen.getByText('1종 · 총 2개')).toBeTruthy()
  expect(screen.getByText('야식으로 먹을 거 찾아요')).toBeTruthy()
})

it('결과가 0건이면 빈 결과 안내를 보여준다', async () => {
  renderResult([])

  fireEvent.click(screen.getByRole('button', { name: '검색 완료' }))

  expect(await screen.findByText('검색 결과가 없습니다')).toBeTruthy()
})
