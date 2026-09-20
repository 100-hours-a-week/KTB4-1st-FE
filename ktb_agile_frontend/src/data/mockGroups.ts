export type JoinedGroup = {
  id: string
  name: string
}

// TODO: 그룹 조회 API가 준비되면 실제 가입 그룹 목록으로 교체한다.
// 빈 배열을 전달하면 그룹 미가입 화면을 확인할 수 있다.
export const mockJoinedGroups: readonly JoinedGroup[] = [
  { id: 'mock-neighborhood', name: '우리 동네 나눔방' },
  { id: 'mock-office', name: '직장 교환 모임' },
  { id: 'mock-hobby', name: '취미 용품 교환' },
]
