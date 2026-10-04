export const GROUP_ERRORS = {
  JOIN_FAILED: '오류가 발생했습니다',
  DATE_LOAD_FAILED: '날짜 가져오기 실패',
  GROUP_LIST_LOAD_FAILED: '그룹 목록을 불러오지 못했습니다. 다시 시도해주세요.',
  ADDRESS_SEARCH_FAILED: '주소 검색 중 오류가 발생했습니다.',
  ADDRESS_QUERY_REQUIRED: '검색할 주소(query)를 입력해주세요.',
  KAKAO_KEY_MISSING: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.',
  KAKAO_SEARCH_FAILED: '카카오 주소 검색 API 호출에 실패했습니다.',
  KAKAO_CONNECTION_FAILED: '카카오 주소 검색 API와 통신할 수 없습니다.',
  NAME_TOO_LONG: (max: number) => `그룹명은 ${max}자 이내로 입력해주세요.`,
  DESCRIPTION_TOO_LONG: (max: number) =>
    `그룹 설명은 ${max}자 이내로 입력해주세요.`,
} as const
