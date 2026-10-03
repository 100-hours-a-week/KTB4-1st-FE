export const TITLE_MAX_LENGTH = 100
export const CONTENT_MAX_LENGTH = 2000

export type RangeMessage = {
  readonly max: number
  readonly title: string
  readonly description: string
}

export const PACE_MESSAGES: readonly RangeMessage[] = Object.freeze(
  [
    {
      max: 19,
      title: '천천히 교환하고 싶어요',
      description: '조건이 잘 맞는 상대를 여유롭게 기다려요.',
    },
    {
      max: 39,
      title: '여유롭게 교환하고 싶어요',
      description: '시간을 두고 괜찮은 제안을 살펴볼게요.',
    },
    {
      max: 59,
      title: '적당한 속도로 교환하고 싶어요',
      description: '조건과 시기를 함께 고려해요.',
    },
    {
      max: 79,
      title: '조금 빠르게 교환하고 싶어요',
      description: '마음에 드는 제안이 오면 빠르게 진행해요.',
    },
    {
      max: 100,
      title: '가능한 빨리 교환하고 싶어요',
      description: '좋은 조건이라면 빠르게 거래를 진행하고 싶어요.',
    },
  ].map((message) => Object.freeze(message)),
)

export const CONDITION_MESSAGES: readonly RangeMessage[] = Object.freeze(
  [
    {
      max: 19,
      title: '가치가 비슷한 물건을 원해요',
      description: '가격 차이가 거의 없는 물건과 교환하고 싶어요.',
    },
    {
      max: 39,
      title: '비슷한 가치면 괜찮아요',
      description: '작은 가치 차이는 고려할 수 있어요.',
    },
    {
      max: 59,
      title: '가치 차이를 어느 정도 고려해요',
      description: '상황에 따라 적당한 가치 차이를 받아들일 수 있어요.',
    },
    {
      max: 79,
      title: '가치 차이에 너그러워요',
      description: '가치가 조금 달라도 조건이 맞으면 괜찮아요.',
    },
    {
      max: 100,
      title: '가치 차이에 유연해요',
      description: '가치 차이보다 원하는 물건인지가 더 중요해요.',
    },
  ].map((message) => Object.freeze(message)),
)
