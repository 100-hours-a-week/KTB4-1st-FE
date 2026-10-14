'use client'

import axios, { type AxiosResponse } from 'axios'
import { useEffect, useState } from 'react'
import '@/config/api'
import { GROUP_ERRORS } from '@/constants/errors/group'
import type { JoinedGroupListResponse, JoinedGroupOption } from '@/types/group'
import { useSmartSearch } from './SmartSearchProvider'
import styles from './AiSmartSearchGroupDropdown.module.css'

export default function AiSmartSearchGroupDropdown() {
  const { groupId, setGroupId, setItems } = useSmartSearch()
  const [groups, setGroups] = useState<JoinedGroupOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadGroups() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const loadedGroups: JoinedGroupOption[] = []
        const seenCursors = new Set<string>()
        let cursor: string | null = null

        while (true) {
          const response: AxiosResponse<JoinedGroupListResponse> =
            await axios.get<JoinedGroupListResponse>('/bff/me/groups', {
              params: cursor ? { cursor } : undefined,
              headers: { Accept: 'application/json' },
              signal: controller.signal,
            })
          if (controller.signal.aborted) return

          const page: JoinedGroupListResponse['data'] = response.data.data
          if (!page || response.data.error) {
            throw new Error(
              response.data.error?.message ||
                GROUP_ERRORS.GROUP_LIST_LOAD_FAILED,
            )
          }

          loadedGroups.push(
            ...page.groups.map(({ groupId, groupName }) => ({
              groupId,
              groupName,
            })),
          )
          if (
            !page.hasNext ||
            !page.nextCursor ||
            seenCursors.has(page.nextCursor)
          ) {
            break
          }
          seenCursors.add(page.nextCursor)
          cursor = page.nextCursor
        }

        setGroups(loadedGroups)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        if (axios.isAxiosError(error) && error.response?.status === 401) return
        setErrorMessage(
          axios.isAxiosError<JoinedGroupListResponse>(error)
            ? error.response?.data.error?.message ||
                GROUP_ERRORS.GROUP_LIST_LOAD_FAILED
            : error instanceof Error
              ? error.message
              : GROUP_ERRORS.GROUP_LIST_LOAD_FAILED,
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    void loadGroups()
    return () => controller.abort()
  }, [retryCount])

  return (
    <section className={styles.groupSection}>
      <label className={styles.groupField}>
        검색할 그룹
        <select
          value={groupId ?? ''}
          disabled={isLoading || groups.length === 0}
          onChange={(event) => {
            setGroupId(Number(event.target.value))
            setItems([])
          }}
        >
          <option value="" disabled>
            {isLoading ? '그룹을 불러오는 중...' : '그룹을 선택해주세요'}
          </option>
          {groups.map((group) => (
            <option key={group.groupId} value={group.groupId}>
              {group.groupName}
            </option>
          ))}
        </select>
      </label>
      {errorMessage && (
        <div className={styles.groupNotice}>
          <p role="alert">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            다시 시도
          </button>
        </div>
      )}
      {!isLoading && !errorMessage && groups.length === 0 && (
        <p className={styles.groupNotice}>가입한 그룹이 없습니다.</p>
      )}
    </section>
  )
}
