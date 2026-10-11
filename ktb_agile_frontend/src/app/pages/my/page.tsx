import Link from 'next/link'
import Navbar from '@/components/common/navbar/Navbar'
import AccountCard from '@/components/my/AccountCard'
import DeleteAccountAction from '@/components/my/DeleteAccountAction'
import styles from './page.module.css'

// 마이페이지에 표시할 항목은 제목과 이동 경로만 여기에서 관리합니다.
const myPageLinks = [
  { title: '내가 올린 상품 보기', href: '/pages/my/myItem' },
  { title: '교환한 물품 내역 보기', href: '/pages/my/exchangeItems' },
  { title: '관심 있어 한 물품 보기', href: '/pages/my/likedItem' },
] as const

export default function MyPage() {
  return (
    <>
      <div className={styles.page}>
        <AccountCard />
        <section className={styles.content}>
          <div className={styles.intro}>
            <h1 id="my-page-heading">나의 활동</h1>
            <p>내 활동을 한곳에서 둘러보세요.</p>
          </div>
          <nav>
            <ul className={styles.linkList}>
              {myPageLinks.map(({ title, href }) => (
                <li key={title}>
                  <Link className={styles.link} href={href}>
                    <span className={styles.linkTitle}>{title}</span>
                    <span className={styles.arrow}>↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <footer className={styles.footer}>
            <DeleteAccountAction />
          </footer>
        </section>
      </div>
      <Navbar />
    </>
  )
}
