type WebpOptions = {
  quality?: number
  maxSize?: number
  fileName?: string
  background?: string
}

export async function convertImageToWebp(
  source: Blob,
  {
    quality = 0.9,
    maxSize,
    fileName = 'item-image.webp',
    background,
  }: WebpOptions = {},
): Promise<File> {
  // 이미 WebP인 원본은 재압축하지 않습니다. 썸네일은 크기를 바꿔 생성합니다.
  if (source.type === 'image/webp' && !maxSize && !background) {
    return source instanceof File
      ? source
      : new File([source], fileName, { type: 'image/webp' })
  }
  const bitmap = await createImageBitmap(source)
  try {
    const scale = maxSize
      ? Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
      : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 변환할 수 없습니다.')
    if (background) {
      context.fillStyle = background
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    )
    // 미지원 브라우저가 반환하는 PNG를 WebP로 잘못 저장하지 않습니다.
    if (!blob || blob.type !== 'image/webp') {
      throw new Error(
        'WebP 이미지 변환에 실패했습니다. WebP 변환을 지원하는 브라우저에서 다시 시도해주세요.',
      )
    }
    return new File([blob], fileName, { type: 'image/webp' })
  } finally {
    bitmap.close()
  }
}
