import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  BadgePercent,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  UserRound,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  shortLabel: string
  icon: LucideIcon
  end?: boolean
  /** Only employees and admins see the entry. */
  staffOnly?: boolean
}

/**
 * The single navigation list used by the sidebar. "Карты и счета" points at the
 * existing `/accounts` route — there is no separate cards page in the app.
 */
export const sidebarNav: NavItem[] = [
  { to: '/', label: 'Главная', shortLabel: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Карты и счета', shortLabel: 'Счета', icon: Landmark },
  { to: '/payments', label: 'Платежи', shortLabel: 'Платежи', icon: ArrowLeftRight },
  { to: '/history', label: 'История', shortLabel: 'История', icon: ReceiptText },
  { to: '/cashback', label: 'Кэшбэк', shortLabel: 'Кэшбэк', icon: BadgePercent },
  { to: '/profile', label: 'Профиль', shortLabel: 'Профиль', icon: UserRound },
]

/** Bottom bar on small screens: four primary destinations plus "Ещё". */
export const bottomNav: NavItem[] = [
  sidebarNav[0],
  sidebarNav[2],
  sidebarNav[3],
  sidebarNav[5],
]

/** Everything else, shown in the "Ещё" sheet. */
export const moreNav: NavItem[] = [sidebarNav[1], sidebarNav[4]]
