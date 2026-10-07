import ModalDefault from '@/components/common/modal/Default'

type LogoutUnavailableModalProps = {
  onClose: () => void
}

export default function LogoutUnavailableModal({
  onClose,
}: LogoutUnavailableModalProps) {
  return (
    <ModalDefault
      message="로그아웃은 현재 지원하지 않는 기능입니다."
      onConfirm={onClose}
    />
  )
}
