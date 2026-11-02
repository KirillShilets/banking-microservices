import { ChartPie } from 'lucide-react'
import type { Activity } from './types'
import {
  activityMinor,
  expensesByCategory,
  isWithinCurrentMonth,
} from './analytics'
import { minorToDecimal, formatMoneyShort } from '../../lib/money'
import { Card } from '../../components/ui/card'
import { Money } from '../../components/ui/money'
import { usePreferences } from '../preferences/preferences-store'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function SpendingChart({ activities }: { activities: Activity[] }) {
  const { hideBalances } = usePreferences()
  const slices = expensesByCategory(activities)
  const total = slices.reduce((sum, slice) => sum + slice.total, 0n)
  const expenseCount = activities.filter(
    (activity) =>
      isWithinCurrentMonth(activity.createdAt) && activityMinor(activity) < 0n,
  ).length
  const averageExpense =
    expenseCount > 0 ? total / BigInt(expenseCount) : 0n

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">
            Расходы за месяц
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">По категориям операций</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-soft text-muted">
          <ChartPie className="h-4 w-4" />
        </span>
      </div>

      {slices.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="relative grid h-24 w-24 place-items-center rounded-full border-[14px] border-line/70">
            <span className="text-[12px] font-semibold text-faint">0 ₽</span>
          </div>
          <p className="mt-4 text-[13px] font-semibold text-ink">Расходов пока нет</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Как только появятся платежи, здесь будет структура трат.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <svg
                viewBox="0 0 140 140"
                className="h-full w-full -rotate-90"
                role="img"
                aria-label="Структура расходов по категориям"
              >
                <circle
                  cx="70"
                  cy="70"
                  r={RADIUS}
                  fill="none"
                  stroke="#eef0e8"
                  strokeWidth="16"
                />
                {slices.map((slice, index) => {
                  const length = slice.share * CIRCUMFERENCE
                  const visible = Math.max(length - 3, 0)
                  const dashOffset = -slices
                    .slice(0, index)
                    .reduce(
                      (sum, previous) => sum + previous.share * CIRCUMFERENCE,
                      0,
                    )

                  return (
                    <circle
                      key={slice.category}
                      cx="70"
                      cy="70"
                      r={RADIUS}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`}
                      strokeDashoffset={dashOffset}
                    />
                  )
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-faint">
                  Всего
                </span>
                <span className="mt-0.5 text-[15px] font-extrabold tracking-[-0.03em] text-ink">
                  {hideBalances ? '•••••' : formatMoneyShort(minorToDecimal(total))}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              {slices.slice(0, 4).map((slice) => (
                <div key={slice.category} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                    {slice.label}
                  </span>
                  <span className="text-[12.5px] font-bold text-ink">
                    {Math.round(slice.share * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
            <span className="text-[12px] text-muted">Средний чек</span>
            <Money
              amount={minorToDecimal(averageExpense)}
              hideZeroFraction
              className="text-[13px] font-bold text-ink"
            />
          </div>
        </>
      )}
    </Card>
  )
}
