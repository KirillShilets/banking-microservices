import { motion } from 'framer-motion'
import { LifeBuoy, LogOut, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ROLE_LABELS, isStaff, useAuth, useAuthUser } from '../../auth'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Logo } from '../ui/logo'
import { useToast } from '../ui/toast'
import { cn } from '../../lib/cn'
import { sidebarNav } from './nav-items'

const PRIVATE_DISMISSED_KEY = 'lumen.sidebar.private.v1'

function readPrivateDismissed(): boolean {
  try {
    return window.localStorage.getItem(PRIVATE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * One flat navigation list (no more "Меню"/"Сервисы" split), a single active
 * marker, and a dismissible promo. The card list lives on the dashboard now.
 */
export function Sidebar() {
  const user = useAuthUser()
  const { logout } = useAuth()
  const toast = useToast()
  const [privateDismissed, setPrivateDismissed] = useState(readPrivateDismissed)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      toast.error('Не удалось завершить сессию')
    }
  }

  const dismissPrivate = () => {
    setPrivateDismissed(true)
    try {
      window.localStorage.setItem(PRIVATE_DISMISSED_KEY, '1')
    } catch {
      // Dismissal is a nicety; the promo simply returns next session.
    }
  }

  const roleLabel = user.primaryRole ? ROLE_LABELS[user.primaryRole] : 'Гость'
  const items = sidebarNav.filter((item) => !item.staffOnly || isStaff(user))

  return (
    <aside className="sidebar-surface fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/[0.06] text-white shadow-sidebar lg:flex">
      <div className="flex items-center justify-between px-6 pb-5 pt-6">
        <Logo tone="light" />
        {user.isDemo ? (
          <Badge variant="lime" className="px-2 py-0.5">
            demo
          </Badge>
        ) : null}
      </div>

      <nav aria-label="Основная навигация" className="flex-1 overflow-y-auto px-3.5">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-white/55 hover:bg-white/[0.045] hover:text-white/90',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.075]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}

                    <span
                      className={cn(
                        'relative grid h-7 w-7 place-items-center rounded-lg transition-colors',
                        isActive ? 'bg-lime text-ink' : 'text-white/55 group-hover:text-white/85',
                      )}
                    >
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                    </span>

                    <span className="relative">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {privateDismissed ? null : (
          <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
            <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-lime/15 blur-2xl" />
            <button
              type="button"
              onClick={dismissPrivate}
              aria-label="Скрыть предложение Lumen Private"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Sparkles className="relative h-4 w-4 text-lime" />
            <p className="relative mt-2.5 text-[13px] font-bold text-white">Lumen Private</p>
            <p className="relative mt-1 text-[13px] leading-relaxed text-white/55">
              {isStaff(user)
                ? 'Инструменты сотрудника и проверка операций.'
                : 'Персональные лимиты и поддержка 24/7.'}
            </p>
            <a
              href="mailto:support@lumen.bank"
              className="relative mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lime transition-opacity hover:opacity-80"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Поддержка 24/7
            </a>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.07] p-3.5">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <NavLink to="/profile" aria-label="Открыть профиль">
            <Avatar name={user.displayName} size="sm" ring />
          </NavLink>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">{user.displayName}</p>
            <p className="truncate text-[13px] text-white/55">{roleLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="Выйти из аккаунта"
            className="grid h-9 w-9 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
