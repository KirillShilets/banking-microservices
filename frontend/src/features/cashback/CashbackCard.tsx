import { BadgePercent, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Activity } from '../activity/types'
import { calculateCashback } from './cashback'
import { useCashbackSelection } from './cashback-store'
import { minorToDecimal } from '../../lib/money'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { Money } from '../../components/ui/money'

interface CashbackCardProps {
  activities: Activity[]
}

export function CashbackCard({ activities }: CashbackCardProps) {
  const selection = useCashbackSelection()
  const summary = calculateCashback(activities, selection)
  const selectedRows = summary.rows.filter((row) => row.selected)

  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(
    new Date(),
  )

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-soft blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">
            Кэшбэк
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {month} · {selection.length} из 3 категорий
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-soft text-amber">
          <BadgePercent className="h-5 w-5" />
        </span>
      </div>

      <div className="relative mt-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
          Предварительно
        </p>
        <Money
          amount={minorToDecimal(summary.estimated)}
          hideZeroFraction
          className="mt-1 block text-[27px] font-extrabold tracking-[-0.045em] text-ink"
        />
        <p className="mt-1 text-[12px] text-muted">
          по операциям текущего месяца
        </p>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {selectedRows.length > 0 ? (
          selectedRows.map((row) => (
            <Badge key={row.id} variant="lime">
              {row.title}
            </Badge>
          ))
        ) : (
          <span className="text-[12px] text-muted">Категории не выбраны</span>
        )}
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-line/70 pt-3">
        <span className="flex items-center gap-1 text-[11.5px] text-muted">
          Лимит <Money amount={minorToDecimal(summary.cap)} hideZeroFraction />
        </span>

        <Link
          to="/cashback"
          className="flex items-center gap-0.5 text-[11.5px] font-bold text-ink transition-colors hover:text-muted"
        >
          Выбрать
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

    </Card>
  )
}
