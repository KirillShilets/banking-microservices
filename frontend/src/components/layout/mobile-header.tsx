import { Bell, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthUser, ROLE_LABELS } from '../../auth'
import { useActivities } from '../../features/activity/use-activities'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Logo } from '../ui/logo'

interface MobileHeaderProps {
  onOpenSearch: () => void
}

export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
  const user = useAuthUser()
  const activities = useActivities(user.subject)

  return (
    <header className="pt-safe sticky top-0 z-30 px-3 pt-3 lg:hidden">
      <div className="glass-panel flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5">
        <Logo />

        <div className="flex items-center gap-1.5">
          {user.isDemo ? (
            <Badge variant="lime" className="hidden min-[380px]:inline-flex">
              demo
            </Badge>
          ) : null}

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Поиск по разделам"
            className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            to="/history"
            aria-label="История операций"
            className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            {activities.length > 0 ? (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose" />
            ) : null}
          </Link>

          <Link
            to="/profile"
            className="ml-0.5 rounded-full"
            aria-label={`Профиль: ${user.displayName}, ${user.primaryRole ? ROLE_LABELS[user.primaryRole] : 'гость'}`}
          >
            <Avatar name={user.displayName} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  )
}
