import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { isStaff, useAuthUser } from '../../auth'
import { Modal } from '../ui/modal'
import { cn } from '../../lib/cn'
import { bottomNav, moreNav } from './nav-items'

/**
 * Small-screen navigation: four primary destinations plus "Ещё" with the rest.
 */
export function BottomNav() {
  const user = useAuthUser()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const extraItems = moreNav.filter((item) => !item.staffOnly || isStaff(user))
  const moreActive = extraItems.some((item) => location.pathname.startsWith(item.to.split('?')[0]))

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
      >
        <div className="glass-panel grid grid-cols-5 gap-0.5 rounded-[22px] border-white/80 p-1.5 shadow-nav">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2"
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-2xl bg-ink"
                      transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                    />
                  ) : null}

                  <item.icon
                    className={cn(
                      'relative h-[19px] w-[19px]',
                      isActive ? 'text-lime' : 'text-muted',
                    )}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />

                  <span
                    className={cn(
                      'relative text-[12px] font-bold tracking-[-0.01em]',
                      isActive ? 'text-white' : 'text-muted',
                    )}
                  >
                    {item.shortLabel}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className="relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-2"
          >
            <MoreHorizontal
              className={cn('h-[19px] w-[19px]', moreActive ? 'text-ink' : 'text-muted')}
              strokeWidth={moreActive ? 2.2 : 1.9}
            />
            <span
              className={cn(
                'text-[12px] font-bold tracking-[-0.01em]',
                moreActive ? 'text-ink' : 'text-muted',
              )}
            >
              Ещё
            </span>
          </button>
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Ещё"
        description="Остальные разделы приложения"
        size="sm"
      >
        <ul className="space-y-1.5">
          {extraItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex h-12 items-center gap-3 rounded-xl border border-line px-3 text-[15px] font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-soft"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime-soft text-[#4f6b0d]">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
