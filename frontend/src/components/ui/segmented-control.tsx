import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  count?: number
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<SegmentOption<T>>
  ariaLabel: string
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const layoutId = `segment-${useId().replace(/[:]/g, '')}`

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-full border border-line/80 bg-white/70 p-1 backdrop-blur-xl',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors duration-200',
              size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-10 px-4 text-[14px]',
              active ? 'text-ink' : 'text-muted hover:text-ink-soft',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full border border-line/80 bg-white shadow-[0_4px_14px_-8px_rgba(10,18,28,0.35)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            {Icon ? <Icon className="relative h-3.5 w-3.5" /> : null}
            <span className="relative">{option.label}</span>
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'relative rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                  active ? 'bg-lime-soft text-[#4f6b0d]' : 'bg-black/[0.05] text-muted',
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
