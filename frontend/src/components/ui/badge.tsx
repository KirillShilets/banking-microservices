import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant =
  | 'neutral'
  | 'lime'
  | 'mint'
  | 'cobalt'
  | 'rose'
  | 'amber'
  | 'dark'
  | 'outline'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-black/[0.055] text-ink-soft',
  lime: 'bg-lime-soft text-[#4f6b0d]',
  mint: 'bg-mint-soft text-emerald',
  cobalt: 'bg-cobalt-soft text-cobalt',
  rose: 'bg-rose-soft text-rose',
  amber: 'bg-amber-soft text-amber',
  dark: 'bg-navy text-white',
  outline: 'border border-line bg-white text-muted',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none tracking-[0.01em]',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
