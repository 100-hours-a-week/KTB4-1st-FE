'use client'

import { useRouter } from 'next/navigation'
import ModalDefault from '@/components/common/modal/Default'
import { GROUP_ERRORS } from '@/constants/errors/group'
import { useHasJoinedGroup } from '@/queries/joinedGroups'

//가입한 그룹이 없으면 화면을 그리지 않고, 모달 확인 시 그룹 목록으로 이동시킴
export default function GroupRequiredGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { hasJoinedGroup, isFetching } = useHasJoinedGroup()

  if (hasJoinedGroup) {
    return <>{children}</>
  }

  //캐시에 남은 미가입 결과로 막지 않도록 최신 조회가 끝날 때까지 기다림
  if (hasJoinedGroup === undefined || isFetching) {
    return null
  }

  return (
    <ModalDefault
      message={GROUP_ERRORS.GROUP_REQUIRED}
      onConfirm={() => router.replace('/pages/groups')}
    />
  )
}
