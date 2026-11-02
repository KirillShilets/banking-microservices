import { ChevronRight } from 'lucide-react'
import type { Activity } from './types'
import { CATEGORY_META } from './analytics'
import { ActivityAmount, ActivityIcon, ActivityStatusBadge } from './activity-ui'
import { formatRelativeDay, formatTime } from '../../lib/date'
import { cn } from '../../lib/cn'

interface TransactionsViewProps {
  activities: Activity[]
  onSelect: (activity: Activity) => void
  className?: string
  showHeader?: boolean
}

export function TransactionsView({
  activities,
  onSelect,
  className,
  showHeader = true,
}: TransactionsViewProps) {
  return (
    <div className={cn('w-full', className)}>
      {showHeader ? (
        <div className="hidden border-b border-line/80 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_120px_130px_100px] lg:gap-4">
          <span>Операция</span>
          <span>Категория</span>
          <span>Дата</span>
          <span className="text-right">Сумма</span>
          <span className="text-right">Статус</span>
        </div>
      ) : null}

      <div className="divide-y divide-line/60">
        {activities.map((activity) => (
          <button
            key={activity.id}
            type="button"
            onClick={() => onSelect(activity)}
            className="group w-full px-1 py-3 text-left transition-colors hover:bg-surface-soft/70 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_120px_130px_100px] lg:items-center lg:gap-4 lg:px-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <ActivityIcon category={activity.category} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-ink">
                  {activity.title}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                  {activity.counterparty}
                </span>
                <span className="mt-1 flex items-center gap-2 lg:hidden">
                  <span className="text-[11.5px] text-faint">
                    {formatRelativeDay(activity.createdAt)}, {formatTime(activity.createdAt)}
                  </span>
                  <ActivityStatusBadge status={activity.status} />
                </span>
              </span>

              <span className="shrink-0 text-right lg:hidden">
                <ActivityAmount activity={activity} />
                <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 text-faint" />
              </span>
            </span>

            <span className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted lg:flex">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_META[activity.category].color }}
              />
              <span className="truncate">{CATEGORY_META[activity.category].label}</span>
            </span>

            <span className="hidden text-[12.5px] text-muted lg:block">
              {formatRelativeDay(activity.createdAt)}
              <span className="ml-1 text-faint">{formatTime(activity.createdAt)}</span>
            </span>

            <span className="hidden text-right lg:block">
              <ActivityAmount activity={activity} />
            </span>

            <span className="hidden justify-end lg:flex">
              <ActivityStatusBadge status={activity.status} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
