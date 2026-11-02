import type { LucideIcon } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface-soft text-ink-soft">
        <div className="absolute inset-0 rounded-2xl bg-lime/20 blur-xl" />
        <Icon className="relative h-6 w-6" strokeWidth={1.7} />
      </div>
      <h3 className="text-[16px] font-bold tracking-[-0.01em] text-ink">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function ErrorState({
  title = 'Что-то пошло не так',
  description,
  onRetry,
  className,
  compact,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title={title}
      description={description}
      className={className}
      compact={compact}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        ) : undefined
      }
    />
  )
}
