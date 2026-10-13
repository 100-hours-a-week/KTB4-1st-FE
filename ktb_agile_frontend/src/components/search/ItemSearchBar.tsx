'use client'

import type { JoinedGroupOption } from '@/types/group'
import styles from './ItemSearchBar.module.css'

type ItemSearchBarProps = {
  groups: JoinedGroupOption[]
  selectedGroupId: number | null
  keyword: string
  isCheckBoxSelected: boolean
  disabled: boolean
  onGroupChange: (groupId: number | null) => void
  onKeywordChange: (keyword: string) => void
  onCheckBoxSelectedChange: (checked: boolean) => void
  onSearch: () => void
}

export default function ItemSearchBar({
  groups,
  selectedGroupId,
  keyword,
  isCheckBoxSelected,
  disabled,
  onGroupChange,
  onKeywordChange,
  onCheckBoxSelectedChange,
  onSearch,
}: ItemSearchBarProps) {
  return (
    <div className={styles.searchArea}>
      <div className={styles.searchControls}>
        <div className={styles.groupField}>
          <select
            value={selectedGroupId ?? ''}
            disabled={groups.length === 0}
            onChange={(event) =>
              onGroupChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          >
            {groups.length === 0 && <option value="">그룹 선택</option>}
            {groups.map((group) => (
              <option key={group.groupId} value={group.groupId}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.searchField}>
          <input
            type="search"
            value={keyword}
            maxLength={255}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="물품 검색"
          />
        </div>
        <button
          type="button"
          className={styles.searchButton}
          onClick={onSearch}
          disabled={
            disabled || groups.length === 0 || keyword.trim().length === 0
          }
        >
          검색
        </button>
      </div>
      <label className={styles.stateFilter}>
        <input
          type="checkbox"
          checked={isCheckBoxSelected}
          onChange={(event) => onCheckBoxSelectedChange(event.target.checked)}
        />
        거래 완료된 물품 제외
      </label>
    </div>
  )
}
