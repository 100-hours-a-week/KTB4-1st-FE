import { convertImageToWebp, type WebpOptions } from './imageWebp'

export type ThumbnailOptions = Omit<WebpOptions, 'maxSize'> & {
  /** 원본 비율을 유지할 긴 변의 최대 픽셀 수. 작은 이미지는 확대하지 않습니다. */
  maxSize: number
}

/** 브라우저에서 썸네일을 생성합니다. 파일 용량은 이미지와 압축 품질에 따라 달라집니다. */
export async function createThumbnail(
  source: Blob,
  {
    maxSize,
    quality = 0.8,
    fileName = 'thumbnail.webp',
    background = '#fff',
  }: ThumbnailOptions,
): Promise<File> {
  if (!Number.isInteger(maxSize) || maxSize <= 0) {
    throw new Error('썸네일 최대 크기는 1 이상의 정수여야 합니다.')
  }
  if (!Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new Error('썸네일 품질은 0 이상 1 이하의 숫자여야 합니다.')
  }
  return convertImageToWebp(source, {
    maxSize,
    quality,
    fileName,
    background,
  })
}
