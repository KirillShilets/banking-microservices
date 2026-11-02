import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftRight,
  BadgePercent,
  CornerDownLeft,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Search,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Modal } from '../ui/modal'
import { useToast } from '../ui/toast'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const commands = [
  { to: '/', label: 'Главная', hint: 'Баланс, счета, последние операции', icon: LayoutDashboard },
  { to: '/payments', label: 'Платежи', hint: 'Пополнение и новые счета', icon: ArrowLeftRight },
  { to: '/history', label: 'История', hint: 'Все операции и выписка', icon: ReceiptText },
  { to: '/accounts', label: 'Мои счета', hint: 'Все счета и реквизиты', icon: Landmark },
  { to: '/cashback', label: 'Кэшбэк', hint: 'Категории и предварительный расчёт', icon: BadgePercent },
  { to: '/profile', label: 'Профиль', hint: 'Данные, безопасность, настройки', icon: UserRound },
] as const

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return undefined

    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [open])

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return commands

    return commands.filter((command) =>
      `${command.label} ${command.hint}`.toLowerCase().includes(normalized),
    )
  }, [query])

  const toast = useToast()

  // react-router resolves the navigation promise; a rejection means the target
  // route failed, so it is surfaced to the user instead of being swallowed.
  // navigate() resolves after the route change; a rejection is surfaced to the
  // user instead of being dropped.
  const go = (to: string) => {
    setQuery('')
    onClose()
    void Promise.resolve(navigate(to)).catch(() => {
      toast.error('Не удалось перейти в раздел')
    })
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Быстрый переход"
      description="Найдите нужный раздел. Esc — закрыть."
      size="md"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filtered[0]) {
              event.preventDefault()
              go(filtered[0].to)
            }
          }}
          placeholder="Например, история или профиль"
          aria-label="Поиск по разделам"
          className="field-base pl-10"
        />
      </div>

      <div className="mt-3 space-y-1">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.map((command) => (
            <motion.button
              key={command.to}
              type="button"
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => go(command.to)}
              className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-surface-soft"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink-soft transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-lime">
                <command.icon className="h-[18px] w-[18px]" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">
                  {command.label}
                </span>
                <span className="block truncate text-[12.5px] text-muted">
                  {command.hint}
                </span>
              </span>

              <CornerDownLeft className="h-4 w-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.button>
          ))}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-[14px] text-muted">
            Ничего не нашлось. Попробуйте «счета» или «платежи».
          </p>
        ) : null}
      </div>

      <div className={cn('mt-3 flex items-center gap-2 border-t border-line pt-3')}>
        <kbd className="rounded-md border border-line bg-surface-soft px-1.5 py-1 font-mono text-[11px] text-muted">
          Enter
        </kbd>
        <span className="text-[12px] text-faint">открыть первый результат</span>
      </div>
    </Modal>
  )
}
