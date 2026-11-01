import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Download,
  ReceiptText,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuthUser } from '../../auth'
import { useActivities } from '../../features/activity/use-activities'
import { TransactionsView } from '../../features/activity/TransactionsView'
import { TransactionDetailsDialog } from '../../features/activity/TransactionDetailsDialog'
import {
  activityMinor,
  CATEGORY_META,
  summariseActivities,
} from '../../features/activity/analytics'
import type { Activity } from '../../features/activity/types'
import { appConfig } from '../../config'
import { formatDate, formatRelativeDay } from '../../lib/date'
import { minorToDecimal } from '../../lib/money'
import { cn } from '../../lib/cn'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { EmptyState } from '../../components/ui/states'
import { Input } from '../../components/ui/input'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import { SegmentedControl } from '../../components/ui/segmented-control'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'

type ActivityFilter = 'all' | 'income' | 'expense' | 'transfer'
type PeriodFilter = 'month' | 'quarter' | 'all'

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Все' },
  { value: 'income' as const, label: 'Доходы' },
  { value: 'expense' as const, label: 'Расходы' },
  { value: 'transfer' as const, label: 'Переводы' },
]

const PAGE_SIZE = 12

function startOfPeriod(period: PeriodFilter): Date | null {
  const now = new Date()

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }

  if (period === 'quarter') {
    const start = new Date(now)
    start.setDate(start.getDate() - 90)
    return start
  }

  return null
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function HistoryPage() {
  const user = useAuthUser()
  const activities = useActivities(user.subject)
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const billParam = searchParams.get('bill')
  const billId = billParam && /^\d+$/.test(billParam) ? Number(billParam) : null

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [selected, setSelected] = useState<Activity | null>(null)

  const scoped = useMemo(() => {
    const start = startOfPeriod(period)
    const normalized = query.trim().toLowerCase()

    return activities.filter((activity) => {
      if (billId !== null && activity.billId !== billId) return false
      if (start && new Date(activity.createdAt).getTime() < start.getTime()) return false

      if (normalized) {
        const haystack = `${activity.title} ${activity.counterparty}`.toLowerCase()
        if (!haystack.includes(normalized)) return false
      }

      return true
    })
  }, [activities, billId, period, query])

  const filtered = useMemo(() => {
    return scoped.filter((activity) => {
      const amount = activityMinor(activity)
      if (filter === 'income') return amount > 0n
      if (filter === 'expense') return amount < 0n
      if (filter === 'transfer') {
        return activity.kind === 'transfer' || activity.category === 'transfer'
      }
      return true
    })
  }, [filter, scoped])

  const totals = useMemo(() => summariseActivities(filtered), [filtered])

  const counts = useMemo(
    () => ({
      all: scoped.length,
      income: scoped.filter((activity) => activityMinor(activity) > 0n).length,
      expense: scoped.filter((activity) => activityMinor(activity) < 0n).length,
      transfer: scoped.filter(
        (activity) =>
          activity.kind === 'transfer' || activity.category === 'transfer',
      ).length,
    }),
    [scoped],
  )

  const groups = useMemo(() => groupByDay(filtered.slice(0, visible)), [filtered, visible])

  const options = FILTER_OPTIONS.map((option) => ({
    ...option,
    count: counts[option.value],
  }))

  const resetVisible = () => setVisible(PAGE_SIZE)

  const clearBill = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('bill')
    setSearchParams(params, { replace: true })
    resetVisible()
  }

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info('Нечего экспортировать')
      return
    }

    const rows = [
      ['Дата', 'Операция', 'Контрагент', 'Категория', 'Счёт', 'Сумма', 'Статус'],
      ...filtered.map((activity) => [
        formatDate(activity.createdAt),
        activity.title,
        activity.counterparty,
        CATEGORY_META[activity.category].label,
        String(activity.billId),
        activity.amount,
        activity.status,
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => escapeCsv(cell)).join(';'))
      .join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `lumen-history-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)

    toast.success('Выписка готова', `${filtered.length} операций экспортировано`)
  }

  return (
    <>
      <PageHeader
        eyebrow="История"
        title="История операций"
        description="Все пополнения и платежи по вашим счетам в одном списке."
        actions={
          <>
            {appConfig.demoMode ? (
              <Badge variant="lime" className="hidden sm:inline-flex">
                демо-данные
              </Badge>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={exportCsv}
            >
              Экспорт
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-line/70">
          <SummaryCell
            label="Доходы"
            amount={minorToDecimal(totals.income)}
            icon={ArrowDownLeft}
            tone="text-emerald"
          />
          <SummaryCell
            label="Расходы"
            amount={minorToDecimal(totals.expenses)}
            icon={ArrowUpRight}
            tone="text-rose"
          />
          <SummaryCell
            label="Итог"
            amount={minorToDecimal(totals.net)}
            icon={ArrowLeftRight}
            tone={totals.net < 0n ? 'text-rose' : 'text-ink'}
          />
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              resetVisible()
            }}
            placeholder="Поиск по операции или контрагенту"
            aria-label="Поиск по истории"
            leadingIcon={<Search className="h-4 w-4" />}
            containerClassName="xl:w-80"
          />

          <SegmentedControl
            value={filter}
            onChange={(next) => {
              setFilter(next)
              resetVisible()
            }}
            options={options}
            ariaLabel="Фильтр операций"
            className="xl:w-auto"
          />

          <Select
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as PeriodFilter)
              resetVisible()
            }}
            aria-label="Период"
            containerClassName="xl:ml-auto xl:w-44"
          >
            <option value="month">Этот месяц</option>
            <option value="quarter">3 месяца</option>
            <option value="all">Всё время</option>
          </Select>
        </div>

        {billId !== null ? (
          <div className="mt-3 flex items-center gap-2 border-t border-line/70 pt-3">
            <span className="text-[12px] text-muted">Фильтр по счёту:</span>
            <button
              type="button"
              onClick={clearBill}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white"
            >
              № {billId}
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </Card>

      <Card className="mt-4 overflow-hidden">
        {groups.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Операций не найдено"
            description={
              activities.length === 0
                ? 'Как только появятся пополнения или платежи, они отобразятся здесь.'
                : 'Попробуйте изменить период, счёт или поисковый запрос.'
            }
            action={
              activities.length === 0 ? undefined : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                    setPeriod('all')
                    clearBill()
                  }}
                >
                  Сбросить фильтры
                </Button>
              )
            }
          />
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="flex items-center justify-between bg-surface-soft/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-faint">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-faint">
                    {group.items.length}
                  </span>
                </div>
                <Money
                  amount={minorToDecimal(group.total)}
                  signed
                  hideZeroFraction
                  className="text-[12px] font-semibold"
                />
              </div>

              <TransactionsView
                activities={group.items}
                onSelect={setSelected}
                showHeader={false}
                className="px-3 sm:px-4"
              />
            </section>
          ))
        )}

        {visible < filtered.length ? (
          <div className="border-t border-line/70 p-4 text-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
            >
              Показать ещё {Math.min(PAGE_SIZE, filtered.length - visible)}
            </Button>
          </div>
        ) : null}
      </Card>

      <div className="mt-4 flex flex-col justify-between gap-2 text-[12px] text-muted sm:flex-row sm:items-center">
        <p>
          Показано {Math.min(visible, filtered.length)} из {filtered.length}{' '}
          операций.
        </p>
        <p className="text-faint">
          {appConfig.demoMode
            ? 'Демо-история хранится в localStorage и не является банковской выпиской.'
            : 'История операций этого приложения хранится на устройстве.'}
        </p>
      </div>

      <TransactionDetailsDialog
        activity={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

function SummaryCell({
  label,
  amount,
  icon: Icon,
  tone,
}: {
  label: string
  amount: string
  icon: LucideIcon
  tone: string
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', tone)} />
        <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-faint">
          {label}
        </span>
      </div>
      <Money
        amount={amount}
        hideZeroFraction
        tone="inherit"
        className={cn('mt-1.5 block text-[17px] font-extrabold tracking-[-0.03em] sm:text-[21px]', tone)}
      />
    </div>
  )
}

interface ActivityGroup {
  key: string
  label: string
  total: bigint
  items: Activity[]
}

function groupByDay(activities: Activity[]): ActivityGroup[] {
  const map = new Map<string, Activity[]>()

  for (const activity of activities) {
    const date = new Date(activity.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const list = map.get(key) ?? []
    list.push(activity)
    map.set(key, list)
  }

  return [...map.entries()].map(([key, items]) => {
    const total = items.reduce((sum, item) => sum + activityMinor(item), 0n)
    const first = items[0]

    return {
      key,
      label: first ? formatRelativeDay(first.createdAt) : '—',
      total,
      items,
    }
  })
}
