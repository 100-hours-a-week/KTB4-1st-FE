export const PREFERENCE_QUESTIONS = [
  {
    value: 'CONVERSATION_STYLE',
    label: '대화 방식',
    options: [
      { value: 'CONCISE', label: '담백하게' },
      { value: 'COMFORTABLE', label: '편안하게' },
      { value: 'WARM', label: '따뜻하게' },
    ],
  },
  {
    value: 'DESCRIPTION_STYLE',
    label: '설명 방식',
    options: [
      { value: 'BRIEF', label: '핵심만 짧게' },
      { value: 'MODERATE', label: '적당히' },
      { value: 'DETAILED', label: '충분히 설명' },
    ],
  },
  {
    value: 'OPINION_STYLE',
    label: '의견 표현 방식',
    options: [
      { value: 'CLEAR', label: '분명하게' },
      { value: 'NATURAL', label: '자연스럽게' },
      { value: 'INDIRECT', label: '완곡하게' },
    ],
  },
] as const
