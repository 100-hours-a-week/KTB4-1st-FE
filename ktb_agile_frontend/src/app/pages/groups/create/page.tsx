'use client'

import { AUTH_ERRORS } from '@/constants/errors/auth'
import { GROUP_ERRORS } from '@/constants/errors/group'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GroupAddressResult } from '@/types/group'
import Navbar from '@/components/common/navbar/Navbar'
import AddressModal from '@/components/groups/address/AddressModal'
import styles from './creategroup.module.css'
import axios from 'axios'
import { API_BASE_URL } from '@/config/api'
import ModalDefault from '@/components/common/modal/Default'
import ModalGroupCreate from '@/components/common/modal/GroupCreate'

const GROUP_NAME_MAX_LENGTH = 30
const GROUP_DESCRIPTION_MAX_LENGTH = 300

function getGroupNameHelperText(value: string) {
  if (!value.trim()) return GROUP_ERRORS.NAME_REQUIRED
  return value.length > GROUP_NAME_MAX_LENGTH
    ? GROUP_ERRORS.NAME_TOO_LONG(GROUP_NAME_MAX_LENGTH)
    : null
}

export default function CreateGroup() {
  const router = useRouter()
  const [isSheetMounted, setIsSheetMounted] = useState(false)
  const [groupAddressInfo, setGroupAddressInfo] = useState<GroupAddressResult | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupNameHelperText, setGroupNameHelperText] = useState<string | null>(
    null,
  )
  const [groupDescriptionHelperText, setGroupDescriptionHelperText] =
    useState<string | null>(null)
  const [roadAddressHelperText, setRoadAddressHelperText] =
    useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGroupCreateModalOpen, setIsGroupCreateModalOpen] = useState<boolean>(false);

  function validateRequiredFields() {
    const nameError = getGroupNameHelperText(groupName)
    const addressError = groupAddressInfo?.roadAddress?.trim()
      ? null
      : GROUP_ERRORS.ROAD_ADDRESS_INPUT_REQUIRED
    setGroupNameHelperText(nameError)
    setRoadAddressHelperText(addressError)
    return nameError === null && addressError === null
  }

  function openGroupCreateModal() {
    if (!validateRequiredFields()) return

    setIsGroupCreateModalOpen(true)
  }

  async function createProcess(){
    if (!validateRequiredFields()) {
      setIsGroupCreateModalOpen(false)
      return
    }

    const accessToken = window.sessionStorage.getItem('accessToken')
    if (!accessToken) {
      setErrorMessage(AUTH_ERRORS.LOGIN_REQUIRED)
      router.replace('/auth/login')
      return
    }

    try{
      await axios.post(
        `${API_BASE_URL}/groups`,
        {
          groupName : groupName,
          roadAddress : groupAddressInfo?.roadAddress,
          latitude : groupAddressInfo?.latitude?.toFixed(6),
          longitude : groupAddressInfo?.longitude?.toFixed(6),
          groupContent : groupDescription
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      )
      
      router.push('/pages/groups')
    }catch(error:unknown){
      const serverMessage = axios.isAxiosError<{ error?: { message?: unknown } }>(error)
        ? error.response?.data?.error?.message
        : undefined
      setIsGroupCreateModalOpen(false)
      setErrorMessage(
        typeof serverMessage === 'string' && serverMessage.trim()
          ? serverMessage
          : GROUP_ERRORS.CREATE_FAILED,
      )
    }
  }

  return (
    <>
      <section className={styles.page} inert={isSheetMounted}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            {/* 뒤로가기 아이콘 */}
            <svg viewBox="0 0 24 24">
              <path d="m14.5 5.5-6.5 6.5 6.5 6.5M8 12h12" />
            </svg>
          </button>
          <h1 className={styles.title}>그룹</h1>
        </header>

        <div className={styles.content}>
          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>그룹 명</p>
            <input
              className={styles.textInput}
              type="text"
              value={groupName}
              placeholder="그룹명을 입력하세요"
              aria-invalid={groupNameHelperText !== null}
              aria-describedby="group-name-helper"
              onBlur={() => setGroupNameHelperText(getGroupNameHelperText(groupName))}
              onChange={(event) => {
                const value = event.target.value
                setGroupName(value)
                setGroupNameHelperText(getGroupNameHelperText(value))
              }}
            />
            {groupNameHelperText !== null && (
              <p id="group-name-helper" className={styles.helperText} aria-live="polite">
                {groupNameHelperText}
              </p>
            )}
          </div>

          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>주소</p>
            <button
              className={styles.locationButton}
              type="button"
              aria-describedby="road-address-helper"
              onClick={() => setIsSheetMounted(true)}
            >
              건물 위치 가져오기
            </button>
            <div className={styles.locationInfo}>
              <strong>그룹 주소 :</strong>
              <span>{groupAddressInfo?.roadAddress ?? '주소를 가져오면 표시됩니다'}</span>
            </div>
            {roadAddressHelperText !== null && (
              <p id="road-address-helper" className={styles.helperText} aria-live="polite">
                {roadAddressHelperText}
              </p>
            )}
          </div>

          <div className={styles.fieldSection}>
            <p className={styles.fieldLabel}>그룹 설명</p>
            <p className={styles.optional}>선택사항</p>
            <textarea
              className={styles.descriptionInput}
              value={groupDescription}
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              placeholder="그룹 설명을 입력하세요"
              onChange={(event) => {
                const value = event.target.value
                setGroupDescription(value)
                setGroupDescriptionHelperText(
                  value.length > GROUP_DESCRIPTION_MAX_LENGTH
                    ? GROUP_ERRORS.DESCRIPTION_TOO_LONG(GROUP_DESCRIPTION_MAX_LENGTH)
                    : null,
                )
              }}
            />
            {groupDescriptionHelperText !== null && (
              <p className={styles.helperText}>
                {groupDescriptionHelperText}
              </p>
            )}
          </div>

          <div className={styles.createArea}>
            <button className={styles.createButton} type="button" onClick={openGroupCreateModal}>
              그룹 생성
            </button>
            <p className={styles.notice}>
              그룹 설정 사항은 추후 수정할 수 없습니다.
            </p>
          </div>
        </div>

        <Navbar />
      </section>
      
      {isSheetMounted && (
        <AddressModal
          onClose={() => setIsSheetMounted(false)}
          onSelect={(address) => {
            setGroupAddressInfo(address)
            setRoadAddressHelperText(
              address.roadAddress?.trim()
                ? null
                : GROUP_ERRORS.ROAD_ADDRESS_INPUT_REQUIRED,
            )
          }}
        />
      )}
      {isGroupCreateModalOpen &&(
        <ModalGroupCreate
          groupName={groupName}
          location = {groupAddressInfo?.roadAddress}
          groupDescription = {groupDescription}
          onCancel ={()=>setIsGroupCreateModalOpen(false)}
          onConfirm={()=>createProcess()}
          />
      )}
      {errorMessage !== null && (
          <ModalDefault
            message={errorMessage}
            onConfirm={() => {
              setErrorMessage(null)
              if(errorMessage === AUTH_ERRORS.LOGIN_REQUIRED) router.replace('/auth/login')
            }}/>
      )}
    </>
  )
}
