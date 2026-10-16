import { PREVIEW_MAX_LENGTH } from '@/constants/content'

export function formatMessagePreview(content: string) {
  const characters = Array.from(content)
  return characters.length > PREVIEW_MAX_LENGTH
    ? `${characters.slice(0, PREVIEW_MAX_LENGTH).join('')}...`
    : content
}
