'use client'

import { useRouter } from 'next/navigation'
import ItemDetailImageContainer from '@/components/item/ItemDetailImageContainer'
import styles from '@/app/pages/items/[itemId]/page.module.css'

const images = [
  { imageId: 1, imageUrl: '/fox.webp', displayOrder: 1 },
  { imageId: 2, imageUrl: '/crane.webp', displayOrder: 2 },
  { imageId: 3, imageUrl: '/kakao_login_large_wide.png', displayOrder: 3 },
]

export default function ItemImagePreview() {
  const router = useRouter()

  return (
    <div className={styles.page}>
      <ItemDetailImageContainer
        images={images}
        title="테스트 사진"
        isLoading={false}
        onBack={() => router.back()}
      />
      <main className={styles.content}>
        <h1 className={styles.title}>물품 사진 넘김 테스트</h1>
        <section className={styles.informationCard}>
          <h2>사진을 누른 채 좌우로 밀어보세요</h2>
          <p>
            여우 → 학 → 카카오 로그인 이미지 순서로 표시됩니다.
            {'\n'}첫 사진과 마지막 사진에서는 검은 여백을 당긴 뒤 원래 사진으로
            돌아옵니다.
          </p>
        </section>
      </main>
    </div>
  )
}
