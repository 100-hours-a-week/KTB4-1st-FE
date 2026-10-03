export const CHAT_ERRORS = {
  AUTH_FAILED: '채팅 인증을 확인할 수 없습니다. 다시 접속해주세요.',
  RECEIVED_MESSAGE_INVALID: '수신한 메시지를 처리하지 못했습니다.',
  SERVER_UNAVAILABLE: '채팅 서버에 연결할 수 없습니다.',
  CONNECTION_REJECTED: '채팅 연결이 거부되었습니다.',
  ROOM_LIST_LOAD_FAILED: '채팅 목록을 불러오지 못했습니다.',
  ROOM_LIST_LOAD_RETRY: '채팅 목록을 불러오지 못했습니다. 다시 시도해주세요.',
  MESSAGE_TOO_LONG: '메시지는 2000자 이내로 입력해주세요.',
  NOT_CONNECTED: '채팅 서버에 연결된 후 다시 시도해주세요.',
  ROOM_ID_INVALID: '올바른 채팅방 ID가 필요합니다.',
  MESSAGE_LOAD_FAILED: '메시지를 불러오지 못했습니다.',
  OLDER_MESSAGE_LOAD_FAILED: '이전 메시지를 불러오지 못했습니다.',
  LEAVE_FAILED: '채팅방을 나가지 못했습니다.',
  EXCHANGE_ACTION_FAILED: (action: string) =>
    `교환 제안을 ${action}하지 못했습니다.`,
} as const
