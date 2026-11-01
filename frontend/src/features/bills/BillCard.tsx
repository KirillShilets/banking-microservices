import { motion } from 'framer-motion'
import { Copy, MoreHorizontal, Nfc, Wallet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { useToast } from '../../components/ui/toast'
import type { BillResponseDTO } from '../../dto/response'
import type { CardSurface } from '../cards/card-designs'
import { Money } from '../../components/ui/money'
import { Skeleton } from '../../components/ui/skeleton'
import { billLast4, billProduct } from './bill-format'

interface BillCardProps {
  bill: BillResponseDTO
  index: number
  onOpen?: (bill: BillResponseDTO) => void
  className?: string
  /** Saved design (gradient or uploaded photo) for this card. */
  surface?: CardSurface | null
}

/** Light-on-image palette used when the customer picked a custom design. */
const designTheme = {
  label: 'text-white/60',
  number: 'text-white/50',
  badge: 'bg-white/15 text-white/85',
  icon: 'bg-lime text-ink',
  accent: 'bg-lime/20',
  balance: 'text-white',
}

const cardThemes = [
  {
    surface:
      'bg-navy text-white border border-white/10 shadow-[0_24px_60px_-32px_rgba(9,17,28,0.85)]',
    label: 'text-white/45',
    number: 'text-white/40',
    badge: 'bg-white/10 text-white/75',
    icon: 'bg-lime text-ink',
    accent: 'bg-lime/20',
    balance: 'text-white',
  },
  {
    surface:
      'bg-[#e4f7b1] text-ink border border-[#d4eda0] shadow-[0_24px_60px_-34px_rgba(120,150,40,0.4)]',
    label: 'text-[#5b6b2b]',
    number: 'text-[#6f7f3b]',
    badge: 'bg-white/60 text-[#4f5f21]',
    icon: 'bg-ink text-lime',
    accent: 'bg-white/40',
    balance: 'text-ink',
  },
  {
    surface:
      'bg-[#c9f0df] text-ink border border-[#b5e5cf] shadow-[0_24px_60px_-34px_rgba(30,122,87,0.32)]',
    label: 'text-[#3d6b58]',
    number: 'text-[#4e7b68]',
    badge: 'bg-white/55 text-[#266c51]',
    icon: 'bg-emerald text-white',
    accent: 'bg-white/40',
    balance: 'text-ink',
  },
  {
    surface:
      'glass-panel text-ink border-white/80 shadow-card',
    label: 'text-muted',
    number: 'text-faint',
    badge: 'bg-black/[0.05] text-ink-soft',
    icon: 'bg-ink text-white',
    accent: 'bg-lime/30',
    balance: 'text-ink',
  },
]

export function BillCard({ bill, index, onOpen, className, surface }: BillCardProps) {
  const theme = surface ? designTheme : cardThemes[index % cardThemes.length]
  const product = billProduct(bill, index)
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(String(bill.billId))
      toast.success('Скопировано', `Номер счёта ${bill.billId}`)
    } catch {
      toast.error('Не удалось скопировать номер')
    }
  }
  const surfaceStyle = surface
    ? surface.image
      ? {
          backgroundImage: `url("${surface.image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { background: surface.background }
    : undefined

  return (
    <motion.div
      role="button"
      tabIndex={0}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.14 }}
      onClick={() => onOpen?.(bill)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.(bill)
        }
      }}
      aria-label={`${product.name}, ${product.kind}, баланс ${bill.amount} рублей. Открыть детали`}
      style={surfaceStyle}
      className={cn(
        'group relative w-[272px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-[26px] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 sm:w-[300px] lg:w-auto',
        surface ? 'border border-white/15 text-white' : cardThemes[index % cardThemes.length].surface,
        className,
      )}
    >
      {surface ? (
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,16,0.78)_0%,rgba(6,10,16,0.32)_46%,rgba(6,10,16,0.8)_100%)]" />
      ) : null}
      <span
        className={cn(
          'pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-2xl',
          theme.accent,
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'pointer-events-none absolute -bottom-16 left-6 h-32 w-32 rounded-full opacity-60 blur-2xl',
          theme.accent,
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className={cn('flex items-center gap-1.5 text-[13px]', theme.label)}>
            <span className="truncate font-bold tracking-[0.01em]">{product.name}</span>
            {/* API has no currency field yet: the mark comes from the product preset. */}
            <span
              className={cn(
                'shrink-0 rounded px-1 py-px text-[11px] font-bold tracking-[0.06em]',
                index === 0 ? 'bg-white/10' : 'bg-black/[0.06]',
              )}
            >
              {product.name.includes('Travel') ? 'USD' : 'RUB'}
            </span>
          </p>
          <p className={cn('mt-0.5 truncate text-[12.5px] font-semibold', theme.number)}>
            {product.kind}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void copyNumber()
            }}
            aria-label={`Скопировать номер счёта ${bill.billId}`}
            className={cn(
              'mt-1 inline-flex items-center gap-1 rounded font-mono text-[12.5px] tracking-[0.1em] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50',
              theme.number,
            )}
          >
            •••• {billLast4(bill)}
            <Copy className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {bill.isDefault ? (
            <span
              className={cn(
                'rounded-full px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]',
                theme.badge,
              )}
            >
              Основной
            </span>
          ) : null}
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-xl',
              theme.icon,
            )}
          >
            <Wallet className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="relative mt-7">
        <p className={cn('text-[11.5px] font-semibold', theme.label)}>Доступно</p>
        <Money
          amount={bill.amount}
          hideZeroFraction
          className={cn(
            'mt-1 block text-[27px] font-extrabold tracking-[-0.045em]',
            theme.balance,
          )}
        />
      </div>

      <div className="relative mt-6 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-6 w-8 place-items-center rounded-md border',
              index === 0
                ? 'border-white/15 bg-white/10'
                : 'border-black/10 bg-white/30',
            )}
            aria-hidden="true"
          >
            <span className="h-3 w-4 rounded-[3px] border border-current opacity-55" />
          </span>
          <Nfc
            className={cn('h-4 w-4 rotate-90', theme.number)}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[11px] font-bold tracking-[0.06em]',
              theme.number,
            )}
          >
            Lumen
          </span>
          <span className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Действия по счёту ${bill.billId}`}
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((value) => !value)
              }}
              className={cn(
                'grid h-7 w-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50',
                index === 0
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : 'bg-white/40 text-ink-soft hover:bg-white/60',
              )}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <span
                role="menu"
                aria-label="Действия по счёту"
                className="absolute right-0 top-8 z-20 w-[190px] rounded-xl border border-line bg-white p-1.5 text-left shadow-float"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation()
                    setMenuOpen(false)
                    onOpen?.(bill)
                  }}
                  className="flex w-full items-center rounded-lg px-2.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-soft focus-visible:outline-none focus-visible:bg-surface-soft"
                >
                  Реквизиты
                </button>
                <span className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-semibold text-faint">
                  Заморозить
                  <span className="text-[11px] font-bold">скоро</span>
                </span>
                <span className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-semibold text-faint">
                  Лимиты
                  <span className="text-[11px] font-bold">скоро</span>
                </span>
              </span>
            ) : null}
          </span>
        </div>
      </div>

    </motion.div>
  )
}

export function BillCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-[272px] shrink-0 rounded-[26px] border border-line bg-white p-5 sm:w-[300px] lg:w-auto',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="mt-8 h-3 w-16" />
      <Skeleton className="mt-2 h-8 w-40" />
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}
