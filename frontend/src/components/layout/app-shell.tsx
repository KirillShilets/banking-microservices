import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { useAuth, useAuthUser } from '../../auth'
import { useActivities } from '../../features/activity/use-activities'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'
import { BottomNav } from './bottom-nav'
import { CommandPalette } from './command-palette'
import { MobileHeader } from './mobile-header'
import { Sidebar } from './sidebar'

function DesktopTopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const user = useAuthUser()
  const activities = useActivities(user.subject)

  return (
    <div className="hidden items-center justify-end gap-4 pb-6 lg:flex">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-10 w-64 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-[13px] text-muted backdrop-blur-xl transition-colors hover:border-line-strong hover:text-ink"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Поиск по разделам</span>
          <kbd className="rounded-md border border-line bg-surface-soft px-1.5 py-0.5 font-mono text-[10.5px] text-faint">
            ⌘K
          </kbd>
        </button>

        <Link
          to="/history"
          aria-label="История операций"
          className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-white/70 text-muted backdrop-blur-xl transition-colors hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          {activities.length > 0 ? (
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose ring-2 ring-white" />
          ) : null}
        </Link>

        <Link
          to="/profile"
          aria-label="Открыть профиль"
          className="rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-line-strong"
        >
          <Avatar name={user.displayName} size="sm" />
        </Link>
      </div>
    </div>
  )
}

export function AppShell() {
  const location = useLocation()
  const outlet = useOutlet()
  const { sessionExpired, login } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Главная',
      '/payments': 'Платежи',
      '/history': 'История',
      '/accounts': 'Мои счета',
      '/profile': 'Профиль',
      '/cashback': 'Кэшбэк',
    }

    document.title = `${titles[location.pathname] ?? 'Страница'} — Lumen Bank`
  }, [location.pathname])

  const handleLogin = async () => {
    setLoginBusy(true)
    try {
      await login()
    } catch (error) {
      console.error('Re-authentication failed', error)
    } finally {
      setLoginBusy(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-lg bg-ink px-4 py-2 text-[15px] font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Перейти к содержимому
      </a>

      <Sidebar />
      <MobileHeader onOpenSearch={() => setSearchOpen(true)} />

      <div className="lg:pl-[272px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-7 xl:px-12">
          <DesktopTopBar onOpenSearch={() => setSearchOpen(true)} />

          <main id="main-content" className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <BottomNav />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Modal
        open={sessionExpired}
        onClose={() => undefined}
        dismissible={false}
        size="sm"
        title="Сессия истекла"
        description="Мы остановили запросы, чтобы не показывать устаревшие данные."
        footer={
          <Button
            className="w-full"
            loading={loginBusy}
            onClick={() => void handleLogin()}
          >
            Войти снова
          </Button>
        }
      >
        <div className="flex items-start gap-3 rounded-2xl bg-surface-soft p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint-soft text-emerald">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted">
            Токен доступа больше не действителен. После входа вы вернётесь к
            текущему разделу — введённые данные формы останутся на месте.
          </p>
        </div>
      </Modal>
    </div>
  )
}
