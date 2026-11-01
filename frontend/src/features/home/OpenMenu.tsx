import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CreditCard, Plus, Wallet } from 'lucide-react'
import { cn } from '../../lib/cn'

interface OpenMenuProps {
  onOpenCard: () => void
  onOpenBill: () => void
  className?: string
}

/**
 * One primary action with a menu: "Открыть карту" or "Открыть счёт".
 * Keyboard: Enter/Space opens, arrows move, Escape closes.
 */
export function OpenMenu({ onOpenCard, onOpenBill, className }: OpenMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const items = [
    {
      label: 'Карта',
      hint: 'Дебетовая, цифровая — за пару минут',
      icon: CreditCard,
      action: onOpenCard,
    },
    {
      label: 'Счёт',
      hint: 'Накопительный или валютный',
      icon: Wallet,
      action: onOpenBill,
    },
  ]

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-lime px-4 text-[14px] font-bold text-ink shadow-[0_10px_26px_-16px_rgba(185,229,72,0.9)] transition-colors hover:bg-lime-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Plus className="h-4 w-4" />
        Открыть
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Что открыть"
          className="absolute left-0 top-12 z-50 w-[260px] overflow-hidden rounded-2xl border border-white/15 bg-navy/95 p-1.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                item.action()
              }}
              className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lime/15 text-lime">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-white">{item.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-white/55">
                  {item.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
