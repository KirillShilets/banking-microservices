import { usePreferences } from '../../features/preferences/preferences-store'
import { cn } from '../../lib/cn'
import {
  formatMoney,
  formatMoneyShort,
  isPositiveAmount,
  toMinorUnits,
} from '../../lib/money'
import type { DecimalValue } from '../../types/money'

type MoneyTone = 'auto' | 'inherit' | 'muted'

interface MoneyProps {
  amount: DecimalValue
  signed?: boolean
  compact?: boolean
  hideZeroFraction?: boolean
  showCurrency?: boolean
  tone?: MoneyTone
  className?: string
  ariaLabel?: string
}

/**
 * Money is rendered from integer minor units via BigInt, so the UI never
 * introduces floating point drift. The component also respects the global
 * "hide balances" privacy preference.
 */
export function Money({
  amount,
  signed = false,
  compact = false,
  hideZeroFraction = false,
  showCurrency = true,
  tone = 'auto',
  className,
  ariaLabel,
}: MoneyProps) {
  const { hideBalances } = usePreferences()

  if (hideBalances) {
    return (
      <span
        aria-label="Сумма скрыта"
        className={cn('tabular-amount tracking-[0.08em]', className)}
      >
        {'••••\u00A0₽'}
      </span>
    )
  }

  const formatted = compact
    ? formatMoneyShort(amount)
    : formatMoney(amount, {
        signed,
        currency: showCurrency,
        hideZeroFraction,
      })

  const isNegative = toMinorUnits(amount) < 0n
  const isPositive = isPositiveAmount(amount)

  const toneClass =
    tone === 'inherit'
      ? undefined
      : tone === 'muted'
        ? 'text-muted'
        : isNegative
          ? 'text-rose'
          : isPositive && signed
            ? 'text-emerald'
            : undefined

  return (
    <span
      aria-label={ariaLabel}
      className={cn('tabular-amount', toneClass, className)}
    >
      {formatted}
    </span>
  )
}
