import styles from './GroupTabs.module.css'

type GroupTabsProps = {
  groups: readonly { groupId: number; groupName: string }[]
  selectedGroupId: number | null
  onSelect: (groupId: number) => void
  ariaLabel?: string
}

export default function GroupTabs({
  groups,
  selectedGroupId,
  onSelect,
  ariaLabel = '그룹 선택',
}: GroupTabsProps) {
  if (groups.length === 0) return null

  return (
    <div
      className={styles.binder}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {groups.map((group) => (
        <button
          key={group.groupId}
          className={`${styles.folder} ${selectedGroupId === group.groupId ? styles.selected : ''}`}
          type="button"
          aria-pressed={selectedGroupId === group.groupId}
          onClick={() => onSelect(group.groupId)}
        >
          {group.groupName}
        </button>
      ))}
    </div>
  )
}
