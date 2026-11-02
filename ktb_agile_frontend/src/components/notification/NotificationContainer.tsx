import type { Notification } from '@/types/notification'
import { formatLastTime } from '@/utils/date'
import styles from './NotificationContainer.module.css'

export default function NotificationContainer({
  notification,
}: {
  notification: Notification
}) {
  return (
    <li className={styles.container}>
      <p className={styles.text}>{notification.text}</p>
      <time className={styles.time} dateTime={notification.createdAt}>
        {formatLastTime(notification.createdAt)}
      </time>
    </li>
  )
}
