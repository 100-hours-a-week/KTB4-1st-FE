export const GROUP_ERRORS = {
  JOIN_FAILED: '오류가 발생했습니다',
  LEAVE_FAILED: '그룹 탈퇴에 실패했습니다. 다시 시도해주세요.',
  LOCATION_DENIED: '위치 제공이 되지 않으면 그룹 참여가 불가능 합니다',
  LOCATION_PERMISSION_HELP:
    '브라우저 주소창의 사이트 설정에서 위치 권한을 허용한 뒤 다시 시도해주세요. 차단된 권한 요청창은 자동으로 다시 열리지 않을 수 있습니다.',
  LOCATION_UNSUPPORTED: '이 브라우저에서는 현재 위치 조회를 지원하지 않습니다.',
  LOCATION_UNAVAILABLE: '현재 위치를 확인할 수 없습니다. 다시 시도해주세요.',
  LOCATION_TIMEOUT: '현재 위치 조회 시간이 초과되었습니다. 다시 시도해주세요.',
  ACCURACY_TOO_LOW: '정확도가 낮습니다. 다시 측정해주세요.',
  DISTANCE_TOO_FAR:
    '현재 참여하려는 그룹의 반경 위치에서 많이 떨어져 있습니다. 반경 500m이내에서 다시 시도하세요',
  DATE_LOAD_FAILED: '날짜 가져오기 실패',
  GROUP_LIST_LOAD_FAILED: '그룹 목록을 불러오지 못했습니다. 다시 시도해주세요.',
  ADDRESS_SEARCH_FAILED: '주소 검색 중 오류가 발생했습니다.',
  ROAD_ADDRESS_REQUIRED: '그룹을 생성하려면 도로명 주소를 선택해주세요.',
  ADDRESS_QUERY_REQUIRED: '검색할 주소(query)를 입력해주세요.',
  KAKAO_KEY_MISSING: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.',
  KAKAO_SEARCH_FAILED: '카카오 주소 검색 API 호출에 실패했습니다.',
  KAKAO_CONNECTION_FAILED: '카카오 주소 검색 API와 통신할 수 없습니다.',
  NAME_TOO_LONG: (max: number) => `그룹명은 ${max}자 이내로 입력해주세요.`,
  DESCRIPTION_TOO_LONG: (max: number) =>
    `그룹 설명은 ${max}자 이내로 입력해주세요.`,
} as const
