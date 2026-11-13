import type { PREFERENCE_QUESTIONS } from '@/constants/preference'

export type PreferenceQuestion = (typeof PREFERENCE_QUESTIONS)[number]['value']
export type PreferenceOption =
  (typeof PREFERENCE_QUESTIONS)[number]['options'][number]['value']

export type PreferenceAnswer = {
  question: PreferenceQuestion
  answer: PreferenceOption
}
