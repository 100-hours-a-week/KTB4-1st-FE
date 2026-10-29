import { notFound } from 'next/navigation'
import ItemImagePreview from './ItemImagePreview'

export default function ItemImagePreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return <ItemImagePreview />
}
