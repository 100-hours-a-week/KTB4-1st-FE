'use client'

import Navbar from '@/components/common/navbar/Navbar'
import NotificationList from '@/components/notification/NotificationList'
import styles from './page.module.css'

export default function NotificationsPage() {
  return (
    <>
      <section className={styles.page} aria-labelledby="notifications-title">
        <h1 id="notifications-title" className={styles.heading}>
          알림
        </h1>
        <NotificationList />
      </section>
      <Navbar />
    </>
  )
}
