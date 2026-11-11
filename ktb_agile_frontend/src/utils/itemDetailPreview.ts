// 목록에서 상세로 넘어갈 때 첫 사진을 미리 받기 위한 주소를 물품별로 기억합니다.
// 서명 URL은 응답마다 문자열이 달라지므로, 상세 화면도 여기서 받은 주소를 그대로 써야
// 브라우저가 진행 중이거나 끝난 요청을 재사용합니다.
const MAX_REMEMBERED_ITEMS = 20

const previewUrls = new Map<number, string>()
// 요청 중인 이미지가 가비지 컬렉션으로 취소되지 않도록 참조를 유지합니다.
const pendingImages = new Map<number, HTMLImageElement>()

/** 목록에서 물품을 누른 순간 상세 화면 첫 사진 요청을 시작합니다. */
export function startItemDetailImage(
  itemId: number,
  url: string | null | undefined,
) {
  if (!url) return

  previewUrls.delete(itemId)
  previewUrls.set(itemId, url)
  while (previewUrls.size > MAX_REMEMBERED_ITEMS) {
    const oldest = previewUrls.keys().next().value!
    previewUrls.delete(oldest)
    pendingImages.delete(oldest)
  }

  if (typeof Image === 'undefined') return
  const image = new Image()
  image.fetchPriority = 'high'
  image.decoding = 'async'
  const release = () => pendingImages.delete(itemId)
  image.onload = release
  image.onerror = release
  image.src = url
  pendingImages.set(itemId, image)
}

/** 목록에서 미리 요청한 상세 화면 첫 사진 주소를 돌려줍니다. */
export function getItemDetailImage(itemId: number): string | null {
  return previewUrls.get(itemId) ?? null
}

/** 쿼리 문자열(서명 값)을 제외한 경로가 같으면 같은 이미지로 봅니다. */
export function isSameImagePath(first: string, second: string) {
  const toPath = (url: string) => {
    try {
      const parsed = new URL(url, 'http://local')
      return `${parsed.origin}${parsed.pathname}`
    } catch {
      return url.split('?')[0]
    }
  }
  return toPath(first) === toPath(second)
}
