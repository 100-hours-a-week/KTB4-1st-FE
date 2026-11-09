import type { ReactNode } from 'react'
import GroupRequiredGuard from '@/components/groups/GroupRequiredGuard'

//그룹에 가입한 사용자만 접근할 수 있음
export default function Layout({ children }: { children: ReactNode }) {
  return <GroupRequiredGuard>{children}</GroupRequiredGuard>
}
