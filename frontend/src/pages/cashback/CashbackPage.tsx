import { useMemo, type ReactNode } from 'react'
import {
  BadgePercent,
  Car,
  Check,
  HandCoins,
  Info,
  ReceiptText,
  Repeat,
  ShoppingBasket,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { useAuthUser } from '../../auth'
import { useActivities } from '../../features/activity/use-activities'
import { CATEGORY_META } from '../../features/activity/analytics'
import {
  CASHBACK_OFFERS,
  MAX_CASHBACK_SELECTION,
  calculateCashback,
  type CashbackOfferId,
} from '../../features/cashback/cashback'
import {
  toggleCashbackOffer,
  useCashbackSelection,
} from '../../features/cashback/cashback-store'
import { appConfig } from '../../config'
import { minorToDecimal } from '../../lib/money'
import { cn } from '../../lib/cn'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import { useToast } from '../../components/ui/toast'

const OFFER_ICONS: Record<CashbackOfferId, LucideIcon> = {
  groceries: ShoppingBasket,
  transport: Car,
  subscriptions: Repeat,
  other: ReceiptText,
}

export function CashbackPage() {
  const user = useAuthUser()
  const activities = useActivities(user.subject)
  const selection = useCashbackSelection()
  const toast = useToast()

  const summary = useMemo(
    () => calculateCashback(activities, selection),
    [activities, selection],
  )

  const selectedRows = summary.rows.filter((row) => row.selected)
  const full = selection.length >= MAX_CASHBACK_SELECTION
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(
    new Date(),
  )
  const capProgress = Math.min(
    Number(summary.estimated) / Number(summary.cap),
    1,
  )

  const handleToggle = (id: CashbackOfferId) => {
    const selected = selection.includes(id)
    const changed = toggleCashbackOffer(id)

    if (changed) return

    toast.info(
      selected ? 'Оставьте хотя бы одну категорию' : 'Можно выбрать не более 3 категорий',
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Сервисы"
        title="Кэшбэк"
        description="Выберите до трёх категорий — кэшбэк рассчитается по операциям текущего месяца."
        actions={
          <Badge variant="lime">
            <BadgePercent className="h-3 w-3" />
            {selection.length} из {MAX_CASHBACK_SELECTION}
          </Badge>
        }
      />

      <Card
        variant="dark"
        className="relative overflow-hidden border-white/10 p-5 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-lime/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="lime">
                <Sparkles className="h-3 w-3" />
                Кэшбэк за {month}
              </Badge>
              <Badge variant="dark" className="border border-white/15">
                {appConfig.demoMode ? 'демо-расчёт' : 'предварительный расчёт'}
              </Badge>
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Предварительный кэшбэк
            </p>
            <Money
              amount={minorToDecimal(summary.estimated)}
              tone="inherit"
              className="mt-1 block text-[42px] font-extrabold tracking-[-0.055em] sm:text-[52px]"
            />
            <p className="mt-2 text-[13px] text-white/45">
              Потрачено{' '}
              <Money
                amount={minorToDecimal(summary.selectedSpend)}
                tone="inherit"
                hideZeroFraction
                className="font-semibold text-white/70"
              />{' '}
              по выбранным категориям
            </p>

            <div className="mt-5 flex flex-wrap gap-1.5">
              {selectedRows.length > 0 ? (
                selectedRows.map((row) => (
                  <span
                    key={row.id}
                    className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11.5px] font-semibold text-white/65"
                  >
                    {row.title} · {row.percent}%
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-white/45">
                  Пока не выбрано ни одной категории
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <CashbackMetric
              label="Лимит"
              value={<Money amount={minorToDecimal(summary.cap)} hideZeroFraction tone="inherit" />}
            />
            <CashbackMetric label="Ставка" value="до 5%" />
            <CashbackMetric
              label="Категорий"
              value={`${selection.length} / ${MAX_CASHBACK_SELECTION}`}
            />
            <CashbackMetric label="Начисление" value="в конце месяца" />
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-extrabold tracking-[-0.025em] text-ink">
                Категории кэшбэка
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                Отметьте до {MAX_CASHBACK_SELECTION} категорий с наибольшей выгодой
              </p>
            </div>
            <span className="hidden text-[11.5px] font-semibold text-muted sm:block">
              {summary.selectedCount} активно
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CASHBACK_OFFERS.map((offer, index) => {
              const row = summary.rows[index]
              const selected = selection.includes(offer.id)
              const meta = CATEGORY_META[offer.category]
              const Icon = OFFER_ICONS[offer.id]
              const dimmed = !selected && full

              return (
                <button
                  key={offer.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleToggle(offer.id)}
                  className={cn(
                    'relative rounded-2xl border p-4 text-left transition-all duration-200',
                    selected
                      ? 'border-ink bg-white shadow-card'
                      : 'border-line bg-surface-soft hover:border-line-strong hover:bg-white',
                    dimmed ? 'opacity-55' : undefined,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{ backgroundColor: meta.soft, color: meta.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>

                    <span className="flex items-center gap-2">
                      {selected ? (
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                      <Badge variant={selected ? 'lime' : 'outline'}>
                        {offer.percent}%
                      </Badge>
                    </span>
                  </div>

                  <p className="mt-3 text-[14px] font-bold text-ink">
                    {offer.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                    {offer.description}
                  </p>

                  <div className="mt-4 flex items-end justify-between border-t border-line/70 pt-3">
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">
                        Потрачено
                      </p>
                      <Money
                        amount={minorToDecimal(row.spend)}
                        hideZeroFraction
                        className="mt-0.5 block text-[13px] font-bold text-ink"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">
                        Кэшбэк
                      </p>
                      <Money
                        amount={minorToDecimal(row.reward)}
                        hideZeroFraction
                        tone={selected ? 'auto' : 'muted'}
                        className="mt-0.5 block text-[13px] font-bold"
                      />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-ink">Ваш выбор</h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  {summary.selectedCount} из {MAX_CASHBACK_SELECTION} категорий
                </p>
              </div>
              <HandCoins className="h-5 w-5 text-faint" />
            </div>

            <div className="mt-4 space-y-2.5">
              {selectedRows.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-muted">{row.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-faint">
                      {row.percent}%
                    </span>
                    <Money
                      amount={minorToDecimal(row.reward)}
                      hideZeroFraction
                      className="text-[12px] font-bold text-ink"
                    />
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-line/70 pt-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted">Итого</span>
                <Money
                  amount={minorToDecimal(summary.estimated)}
                  hideZeroFraction
                  className="text-[14px] font-extrabold text-ink"
                />
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
                <div
                  className="h-full rounded-full bg-ink transition-[width] duration-500"
                  style={{ width: `${Math.max(capProgress * 100, 2)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10.5px] text-faint">
                Лимит кэшбэка — <Money amount={minorToDecimal(summary.cap)} hideZeroFraction /> в месяц
              </p>
            </div>
          </Card>

          <Card variant="soft" className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-muted">
                <Info className="h-4.5 w-4.5" />
              </span>
              <h2 className="text-[13px] font-bold text-ink">Как это работает</h2>
            </div>
            <ol className="mt-3 space-y-2.5">
              {[
                'Выберите до трёх категорий.',
                'Кэшбэк считается по операциям текущего месяца.',
                'Итоговая сумма ограничена 3 000 ₽ в месяц.',
              ].map((step, index) => (
                <li
                  key={step}
                  className="flex gap-2.5 text-[12px] leading-relaxed text-muted"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-ink">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          <p className="px-1 text-[10.5px] leading-relaxed text-faint">
            Расчёт построен на операциях, доступных в приложении. Выбор категорий
            сохраняется на устройстве.
          </p>
        </aside>
      </div>
    </>
  )
}

function CashbackMetric({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-bold text-white/80">{value}</p>
    </div>
  )
}
