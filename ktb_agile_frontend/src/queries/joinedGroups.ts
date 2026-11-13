import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import type { JoinedGroupListResponse } from '@/types/group'

export const joinedGroupKeys = {
  all: ['me', 'groups'] as const,
}

//가입한 그룹이 하나라도 있는지 확인함 (확인 전에는 undefined)
export function useHasJoinedGroup() {
  const { data, isFetching } = useQuery({
    queryKey: joinedGroupKeys.all,
    queryFn: async ({ signal }) => {
      const response = await axios.get<JoinedGroupListResponse>(
        '/bff/me/groups',
        { headers: { Accept: 'application/json' }, signal },
      )
      return response.data.data?.groups ?? []
    },
  })

  return {
    hasJoinedGroup: data === undefined ? undefined : data.length > 0,
    isFetching,
  }
}
