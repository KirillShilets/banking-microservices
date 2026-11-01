import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type CardVariant = 'plain' | 'glass' | 'dark' | 'soft'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children: ReactNode
}

const variantClasses: Record<CardVariant, string> = {
  plain: 'border border-line bg-white shadow-card',
  glass: 'glass-panel',
  dark: 'noise-surface border border-white/10 bg-navy text-white',
  soft: 'border border-line/70 bg-surface-soft',
}

export function Card({
  variant = 'plain',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn('rounded-3xl', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
}
