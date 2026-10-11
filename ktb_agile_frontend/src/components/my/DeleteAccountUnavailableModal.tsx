import ModalDefault from '@/components/common/modal/Default'

type DeleteAccountUnavailableModalProps = {
  onClose: () => void
}

export default function DeleteAccountUnavailableModal({
  onClose,
}: DeleteAccountUnavailableModalProps) {
  return (
    <ModalDefault
      message="회원 탈퇴는 현재 지원하지 않는 기능입니다."
      onConfirm={onClose}
    />
  )
}
