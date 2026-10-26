import type { ReactNode } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'

//pages 하위 화면은 모두 로그인이 필요함
export default function Layout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>
}
