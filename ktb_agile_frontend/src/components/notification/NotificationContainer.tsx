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
      <div className={styles.content}>
        <p className={styles.text}>{notification.text}</p>
        <time className={styles.time} dateTime={notification.createdAt}>
          {formatLastTime(notification.createdAt)}
        </time>
      </div>
      {notification.thumbnailImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Use the thumbnail URL supplied by the backend directly.
        <img
          className={styles.thumbnail}
          src={notification.thumbnailImageUrl}
          alt="알림 관련 물품 사진"
          width={80}
          height={80}
          decoding="async"
        />
      )}
    </li>
  )
}
