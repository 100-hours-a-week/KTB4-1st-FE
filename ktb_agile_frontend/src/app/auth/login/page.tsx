'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function Login() {
  const router = useRouter()

  function loginProcess() {
    router.push('/pages/items')
  }

  return (
    <section className={styles.loginPage}>
      <h1 className={styles.title}>로그인</h1>
      <button
        className={styles.kakaoLoginButton}
        type="button"
        onClick={loginProcess}
        aria-label="카카오 로그인"
      >
        <Image
          className={styles.kakaoLoginImage}
          src="/kakao_login_large_wide.png"
          alt=""
          width={600}
          height={90}
        />
      </button>
    </section>
  )
}
