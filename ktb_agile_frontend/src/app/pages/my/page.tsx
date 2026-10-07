import Navbar from '@/components/common/navbar/Navbar'
import AccountCard from '@/components/my/AccountCard'
import DeleteAccountAction from '@/components/my/DeleteAccountAction'
import styles from './page.module.css'

export default function MyPage() {
  return (
    <>
      <div className={styles.page}>
        <AccountCard />
        <section className={styles.activity}>
          <h1>내 활동</h1>
        </section>
        <footer className={styles.footer}>
          <DeleteAccountAction />
        </footer>
      </div>
      <Navbar />
    </>
  )
}
