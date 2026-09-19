'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import styles from './Navbar.module.css'

type NavItemId = 'home' | 'group' | 'register' | 'chat'

type NavItem = {
  id: NavItemId
  label: string
  href: string
  icon: ReactNode
  isCurrentPath: (pathname: string) => boolean
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: '홈',
    href: '/pages/items',
    isCurrentPath: (pathname) => pathname === '/pages/items',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10.7 8.5-7 8.5 7v8.1a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7v-8.1Z" />
        <path d="M9.2 20.5v-6.8h5.6v6.8" />
      </svg>
    ),
  },
  {
    id: 'group',
    label: '그룹',
    href: '/pages/groups',
    isCurrentPath: (pathname) =>
      pathname === '/pages/groups' || pathname.startsWith('/pages/groups/'),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.8 11.2a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z" />
        <path d="M2.8 19.4c.3-3.1 2.7-5.2 6-5.2s5.7 2.1 6 5.2" />
        <path d="M15 5.1a3.3 3.3 0 0 1 0 6.2M16.2 14.3c2.8.4 4.6 2.3 4.9 5.1" />
      </svg>
    ),
  },
  {
    id: 'register',
    label: '등록하기',
    href: '/pages/items/register',
    isCurrentPath: (pathname) =>
      pathname === '/pages/items/register' ||
      pathname.startsWith('/pages/items/register/'),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.7" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: '채팅',
    href: '/pages/chat',
    isCurrentPath: (pathname) =>
      pathname === '/pages/chat' ||
      pathname.startsWith('/pages/chat/'),
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.5 11.3a8.2 8.2 0 0 1-8.5 7.8c-1.3 0-2.6-.3-3.7-.8l-4.5 1.2 1.3-4A7.4 7.4 0 0 1 3.5 11c0-4.5 3.8-8.1 8.5-8.1s8.5 3.6 8.5 8.1v.3Z" />
        <path d="M8 11h.1M12 11h.1M16 11h.1" />
      </svg>
    ),
  },
]

const getNavItemFromPathname = (pathname: string) =>
  navItems.find((item) => item.isCurrentPath(pathname))

export default function Navbar() {
  const pathname = usePathname()
  const pathNavItem = getNavItemFromPathname(pathname)
  const [selectedItemId, setSelectedItemId] = useState<NavItemId>(
    () => pathNavItem?.id ?? 'home',
  )
  const activeItemId = pathNavItem?.id ?? selectedItemId

  return (
    <nav className={styles.navbar} aria-label="주요 메뉴">
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const isActive = activeItemId === item.id

          return (
            <li className={styles.navItem} key={item.id}>
              <Link
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onNavigate={() => setSelectedItemId(item.id)}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
