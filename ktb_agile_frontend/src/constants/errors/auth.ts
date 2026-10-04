export const AUTH_ERRORS = {
  LOGIN_REQUIRED: '로그인이 필요합니다.',
  LOGIN_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  LOGIN_FAILED: '로그인에 오류가 발생했습니다.\n다시 시도해주세요.',
  SERVER_UNAVAILABLE: '서버에 연결할 수 없습니다.\n잠시 후 다시 시도해주세요.',
  LOGIN_INFO_LOAD_FAILED: '로그인 정보를 불러오지 못했습니다. 다시 로그인해주세요.',
  AUTH_SERVER_UNAVAILABLE: '인증 서버에 연결할 수 없습니다.',
  ACCESS_TOKEN_MISSING: 'Access token is missing from refresh response.',
} as const
