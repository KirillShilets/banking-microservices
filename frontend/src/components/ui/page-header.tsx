import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  backTo?: string
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backTo,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6',
        className,
      )}
    >
      <div className="min-w-0">
        {backTo ? (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Назад
          </Link>
        ) : null}

        {eyebrow ? (
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-faint">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[35px] lg:text-[39px]">
          {title}
        </h1>

        {description ? (
          <div className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted sm:text-[15px]">
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
