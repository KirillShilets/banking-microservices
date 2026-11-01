import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  EyeOff,
  Link2,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { isStaff, useAuthUser } from '../../auth'
import { useAccount } from '../../features/account/AccountProvider'
import { CreateAccountDialog } from '../../features/account/CreateAccountDialog'
import { LinkAccountDialog } from '../../features/account/LinkAccountDialog'
import { useBills, summariseBills } from '../../features/bills/use-bills'
import { BillCard, BillCardSkeleton } from '../../features/bills/BillCard'
import { CardStack } from '../../features/bills/CardStack'
import { billLast4, billProduct } from '../../features/bills/bill-format'
import { BillDetailsDialog, OpenBillDialog } from '../../features/bills/BillDialogs'
import { OpenCardDialog } from '../../features/cards/OpenCardDialog'
import { OpenMenu } from '../../features/home/OpenMenu'
import { StartChecklist } from '../../features/onboarding/StartChecklist'
import {
  findCardDesign,
  setActiveCardId,
  useActiveCardId,
  useCardDesigns,
} from '../../features/cards/card-design-store'
import { buildSurface } from '../../features/cards/card-designs'
import { getCardOrders } from '../../features/cards/card-order-store'
import { useActivities } from '../../features/activity/use-activities'
import { TransactionsView } from '../../features/activity/TransactionsView'
import { TransactionDetailsDialog } from '../../features/activity/TransactionDetailsDialog'
import { SpendingChart } from '../../features/activity/SpendingChart'
import { SavingsGoalCard } from '../../features/activity/SavingsGoalCard'
import { CashbackCard } from '../../features/cashback/CashbackCard'
import { setPreference, usePreferences } from '../../features/preferences/preferences-store'
import type { Activity } from '../../features/activity/types'
import type { BillResponseDTO } from '../../dto/response'
import { getFirstName, getGreeting } from '../../lib/date'
import { minorToDecimal } from '../../lib/money'
import { toMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'

function formatToday(): string {
  const value = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function pluralBills(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) return 'счёт'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'счёта'
  return 'счетов'
}

export function HomePage() {
  const user = useAuthUser()
  const navigate = useNavigate()
  const { hideBalances } = usePreferences()

  const {
    isLoading,
    isAccountMissing,
    needsAccountLink,
    error,
    refetch,
  } = useAccount()

  const billsQuery = useBills()
  const bills = billsQuery.data ?? []
  const summary = summariseBills(bills)
  const activities = useActivities(user.subject)

  const activeCardId = useActiveCardId(user.subject)

  const designs = useCardDesigns(user.subject)
  const heroBills = bills
  const activeCard = heroBills.find((bill) => bill.billId === activeCardId) ?? null
  const activeIndex = activeCard ? heroBills.indexOf(activeCard) : -1


  /** Tapping the expanded card walks to the next card, wrapping around. */
  const selectNextCard = (delta = 1) => {
    if (heroBills.length === 0) return
    const index = bills.findIndex((bill) => bill.billId === activeCardId)
    const next = bills[(index + delta + bills.length) % bills.length]
    setActiveCardId(user.subject, next.billId)
  }

  const designSurface = (bill: BillResponseDTO) => {
    const design = findCardDesign(designs, bill.billId)
    if (design) {
      return buildSurface(design.designId, design.paletteId, design.pattern, design.thumb)
    }
    // Cards ordered before designs were stored still keep their palette.
    const order = getCardOrders(user.subject).find((item) => item.billId === bill.billId)
    if (order && !order.customDesign) {
      return buildSurface(order.designId, 'graphite', 'grid', null)
    }
    return null
  }

  const [selectedBill, setSelectedBill] = useState<BillResponseDTO | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [openBillOpen, setOpenBillOpen] = useState(false)
  const [openCardOpen, setOpenCardOpen] = useState(false)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [linkAccountOpen, setLinkAccountOpen] = useState(false)

  const staff = isStaff(user)
  const firstName = getFirstName(user.displayName || 'гость')

  if (isLoading) {
    return <HomeSkeleton />
  }

  if (error && !isAccountMissing) {
    return (
      <Card className="mt-2">
        <ErrorState
          title="Не удалось загрузить профиль"
          description={toMessage(error)}
          onRetry={() => void refetch()}
        />
      </Card>
    )
  }

  if (isAccountMissing) {
    return (
      <>
        <PageHeader
          eyebrow="Главная"
          title={`Добро пожаловать, ${firstName}`}
          description="Остался один шаг до первого счёта в Lumen."
        />

        <NoAccountState onCreate={() => setCreateAccountOpen(true)} />

        <CreateAccountDialog
          open={createAccountOpen}
          onClose={() => setCreateAccountOpen(false)}
        />
      </>
    )
  }

  if (needsAccountLink) {
    return (
      <>
        <PageHeader
          eyebrow="Главная"
          title="Привяжите счёт"
          description="Профиль найден, но это устройство ещё не знает номер счёта."
        />

        <LinkAccountState onLink={() => setLinkAccountOpen(true)} />

        <LinkAccountDialog
          open={linkAccountOpen}
          onClose={() => setLinkAccountOpen(false)}
        />
      </>
    )
  }

  const recent = activities.slice(0, 5)
  const openTopUp = () => navigate('/payments?tab=topup')
  const openRequisites = () => navigate('/payments?tab=requisites')

  return (
    <>
      <PageHeader
        eyebrow="Главная"
        title={`${getGreeting()}, ${firstName}`}
        description={`${formatToday()} · ${bills.length} ${pluralBills(bills.length)}`}
        actions={
          <Button
            variant="secondary"
            size="icon"
            aria-label={hideBalances ? 'Показать балансы' : 'Скрыть балансы'}
            aria-pressed={hideBalances}
            title={hideBalances ? 'Показать балансы' : 'Скрыть балансы'}
            onClick={() => setPreference('hideBalances', !hideBalances)}
          >
            {hideBalances ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        }
      />

      {/* Balance hero — the visual anchor of the dashboard. */}
      <section className="noise-surface relative overflow-hidden rounded-[30px] bg-navy px-5 py-6 text-white shadow-[0_36px_90px_-46px_rgba(9,17,28,0.8)] sm:px-7 sm:py-8 lg:px-9">
        <div className="bg-grid-faint pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-lime/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-white/40">
                Всего на счетах
              </span>
              <button
                type="button"
                onClick={() => setPreference('hideBalances', !hideBalances)}
                aria-label={hideBalances ? 'Показать баланс' : 'Скрыть баланс'}
                className="grid h-6 w-6 place-items-center rounded-md text-white/35 transition-colors hover:bg-white/10 hover:text-white/80"
              >
                {hideBalances ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {billsQuery.isPending ? (
              <div className="mt-3 h-[46px] w-64 max-w-full animate-pulse rounded-xl bg-white/10 sm:h-[58px] lg:h-[66px]" />
            ) : billsQuery.isError ? (
              <p className="mt-2 text-[43px] font-extrabold leading-none tracking-[-0.055em] text-white/50 sm:text-[57px] lg:text-[65px]">
                —
              </p>
            ) : (
              <Money
                amount={minorToDecimal(summary.total)}
                tone="inherit"
                className="mt-2 block text-[43px] font-extrabold leading-none tracking-[-0.055em] sm:text-[57px] lg:text-[65px]"
              />
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveCardId(user.subject, null)}
                aria-pressed={activeCard === null}
                title="Показать общий баланс"
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  activeCard === null
                    ? 'border-lime/30 bg-lime/10 text-lime'
                    : 'border-white/10 bg-white/[0.06] text-white/60 hover:text-white',
                )}
              >
                {bills.length} {pluralBills(bills.length)}
              </button>
              {activeCard || summary.defaultBill ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/60">
                  {billProduct(activeCard ?? summary.defaultBill!, activeCard ? activeIndex : 0).name} ·
                  ···· {billLast4(activeCard ?? summary.defaultBill!)}
                </span>
              ) : null}
              {summary.overdraftBills.length > 0 ? (
                <span className="rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-[12px] font-semibold text-lime">
                  Овердрафт доступен
                </span>
              ) : null}
            </div>


            <div className="mt-4">
              <OpenMenu
                onOpenCard={() => setOpenCardOpen(true)}
                onOpenBill={() => setOpenBillOpen(true)}
              />
            </div>
          </div>

          <div className="hidden sm:block">
            {billsQuery.isPending ? (
              <Skeleton className="h-[232px] w-full max-w-[330px] rounded-[24px] bg-white/10" />
            ) : (
              <CardStack
                bills={bills}
                surfaceFor={designSurface}
                activeBillId={activeCardId}
                onSelect={(bill) => setActiveCardId(user.subject, bill.billId)}
                onAdvance={selectNextCard}
              />
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
        <div className="min-w-0 space-y-3">
          <QuickActions onTopUp={openTopUp} onRequisites={openRequisites} />

          <section aria-labelledby="accounts-heading">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h2
                  id="accounts-heading"
                  className="text-[17px] font-extrabold tracking-[-0.025em] text-ink"
                >
                  Мои карты и счета
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Дебетовые, накопительные и валютные продукты
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  to="/accounts"
                  className="flex items-center gap-1 text-[12.5px] font-bold text-muted transition-colors hover:text-ink"
                >
                  Все счета
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {billsQuery.isPending ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <BillCardSkeleton key={index} className="w-full" />
                ))}
              </div>
            ) : billsQuery.isError ? (
              <Card>
                <ErrorState
                  compact
                  description={toMessage(billsQuery.error)}
                  onRetry={() => void billsQuery.refetch()}
                />
              </Card>
            ) : bills.length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  icon={Wallet}
                  title="Счетов пока нет"
                  description="Откройте первый счёт — это займёт пару секунд."
                  action={
                    <Button
                      size="sm"
                      leadingIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setOpenBillOpen(true)}
                    >
                      Открыть счёт
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                {bills.slice(0, 3).map((bill, index) => (
                  <BillCard
                    key={bill.billId}
                    bill={bill}
                    index={index}
                    onOpen={setSelectedBill}
                    className="w-full"
                    surface={designSurface(bill)}
                  />
                ))}
              </div>
            )}
          </section>

          {activities.length === 0 ? (
            <StartChecklist
              hasTopUp={activities.some(
                (item) => item.kind === 'deposit' || item.category === 'topup',
              )}
              hasTransfer={activities.some(
                (item) => item.kind === 'transfer' || item.category === 'transfer',
              )}
              hasCashback={false}
              onTopUp={openTopUp}
              onTransfer={openTopUp}
              onCashback={() => navigate('/cashback')}
            />
          ) : null}

          <Card className="overflow-hidden">
            <div className="flex items-start justify-between px-4 pb-3 pt-4 sm:px-5">
              <div>
                <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
                  Последние операции
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Движения по всем счетам
                </p>
              </div>

              <Link
                to="/history"
                className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-line-strong hover:bg-surface-soft"
              >
                Все
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                compact
                icon={ReceiptText}
                title="Операций пока нет"
                description={
                  staff
                    ? 'Сделайте тестовое пополнение, чтобы увидеть движение средств.'
                    : 'Здесь появятся пополнения и платежи по вашим счетам.'
                }
                action={
                  staff ? (
                    <Button size="sm" onClick={openTopUp}>
                      Пополнить счёт
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <TransactionsView
                activities={recent}
                onSelect={setSelectedActivity}
                className="px-3 pb-2 sm:px-4"
              />
            )}
          </Card>

          <div className="xl:hidden">
            <SpendingChart activities={activities} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="hidden xl:block">
            <SpendingChart activities={activities} />
          </div>
          <CashbackCard activities={activities} />
          <SavingsGoalCard />

          {staff ? (
            <Card variant="dark" className="p-5">
              <div className="flex items-center justify-between">
                <Badge variant="lime">Тестовый режим</Badge>
                <ShieldCheck className="h-4 w-4 text-lime" />
              </div>
              <h2 className="mt-3 text-[15px] font-bold text-white">
                Инструменты сотрудника
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/45">
                Тестовое пополнение и проверка депозита. Доступно ролям employee
                и admin.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="outline-light"
                  size="sm"
                  className="justify-start"
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={openTopUp}
                >
                  Пополнить счёт
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start text-white/60 hover:bg-white/[0.06] hover:text-white"
                  leadingIcon={<ReceiptText className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/payments?tab=deposit')}
                >
                  Проверить депозит
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-emerald">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13.5px] font-bold text-ink">Ваши средства защищены</p>
                  <p className="text-[12px] text-muted">Доступ через защищённый вход</p>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                Все запросы к банковскому API подписаны токеном. Сессия
                обновляется автоматически.
              </p>
            </Card>
          )}
        </aside>
      </div>

      <BillDetailsDialog bill={selectedBill} onClose={() => setSelectedBill(null)} />
      <TransactionDetailsDialog
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
      <OpenBillDialog
        open={openBillOpen}
        onClose={() => setOpenBillOpen(false)}
        onOpened={() => void billsQuery.refetch()}
      />
      <OpenCardDialog
        open={openCardOpen}
        onClose={() => setOpenCardOpen(false)}
        onOpened={() => void billsQuery.refetch()}
      />
      <CreateAccountDialog
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
      />
      <LinkAccountDialog
        open={linkAccountOpen}
        onClose={() => setLinkAccountOpen(false)}
      />
    </>
  )
}

function QuickActions({
  onTopUp,
  onRequisites,
}: {
  onTopUp: () => void
  onRequisites: () => void
}) {
  const actions = [
    {
      label: 'Пополнить',
      icon: Plus,
      tone: 'bg-lime-soft text-[#4f6b0d]',
      onClick: onTopUp,
    },
    {
      label: 'Перевести',
      icon: ArrowUpRight,
      tone: 'bg-mint-soft text-emerald',
      onClick: onTopUp,
    },
    {
      label: 'Оплатить',
      icon: ReceiptText,
      tone: 'bg-cobalt-soft text-cobalt',
      onClick: undefined,
      to: '/payments',
    },
    {
      label: 'Реквизиты',
      icon: CreditCard,
      tone: 'bg-amber-soft text-amber',
      onClick: onRequisites,
    },
  ] as const

  return (
    <div className="glass-panel rounded-2xl p-1.5">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {actions.map((action, index) => {
          const content = (
            <>
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5',
                  action.tone,
                )}
              >
                <action.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <span className="truncate text-[13.5px] font-bold text-ink">
                {action.label}
              </span>
            </>
          )

          const className =
            'group flex h-12 w-full items-center gap-2.5 rounded-xl px-3 text-left transition-colors duration-200 hover:bg-white/80'

          return (
            <motion.div
              key={action.label}
              className="min-w-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.03 * index, ease: [0.22, 1, 0.36, 1] }}
            >
              {'to' in action && action.to ? (
                <Link to={action.to} className={className}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={action.onClick} className={className}>
                  {content}
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function NoAccountState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <Badge variant="lime">
            <Sparkles className="h-3 w-3" /> Первый счёт
          </Badge>
          <h2 className="mt-4 text-[29px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[35px]">
            Откройте профиль
            <br />
            в Lumen Bank
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted">
            Создайте профиль, чтобы получить счета, реквизиты и доступ к
            истории операций. Начальный баланс — 0 ₽, овердрафт подключается
            позже.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              'Профиль и счета за пару минут',
              'До 20 счетов на одном профиле',
              'Защита через защищённый вход',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13.5px] text-ink-soft">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-lime-soft text-[#4f6b0d]">
                  <ShieldCheck className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <Button
            className="mt-7"
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={onCreate}
          >
            Создать профиль
          </Button>
        </div>

        <div className="relative min-h-[260px] overflow-hidden bg-navy p-6 lg:min-h-full">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-mint/10 blur-3xl" />
          <div className="relative mx-auto mt-8 w-[250px] rotate-[-7deg] rounded-2xl border border-white/15 bg-gradient-to-br from-white/20 to-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-white/40">
              Lumen Private
            </p>
            <div className="mt-8 h-7 w-10 rounded-md bg-gradient-to-br from-lime to-[#e8f7bd]" />
            <p className="mt-4 font-mono text-[14px] tracking-[0.16em] text-white/70">
              •••• •••• •••• 5001
            </p>
            <p className="mt-5 text-[11px] font-semibold text-white/50">
              LUMEN CLIENT
            </p>
          </div>
          <div className="relative mx-auto mt-[-14px] w-[250px] rotate-[4deg] rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Savings
              </span>
              <Wallet className="h-4 w-4 text-mint" />
            </div>
            <p className="mt-5 text-[18px] font-extrabold tracking-[-0.04em] text-white/80">
              Накопительный счёт
            </p>
            <p className="mt-1 text-[11px] text-white/40">RUB · без овердрафта</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LinkAccountState({ onLink }: { onLink: () => void }) {
  return (
    <Card className="p-6 sm:p-10">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-soft text-amber">
          <Link2 className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-[25px] font-extrabold tracking-[-0.04em] text-ink">
          Нужен номер счёта
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Профиль найден, но счета не привязаны к этому устройству. Введите
          номер счёта из договора — мы проверим, что он принадлежит вам.
        </p>

        <Button className="mt-6" onClick={onLink} leadingIcon={<Link2 className="h-4 w-4" />}>
          Привязать счёт
        </Button>

        <p className="mt-4 text-[12px] text-faint">
          Номер счёта — это цифровой идентификатор, а не номер карты.
        </p>
      </div>
    </Card>
  )
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка главной страницы">
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-3 w-56" />
      </div>

      <Skeleton className="h-[280px] w-full rounded-[30px] bg-navy/10" />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[92px] rounded-2xl" />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[190px] rounded-[26px]" />
        <Skeleton className="h-[190px] rounded-[26px]" />
      </div>

      <div className="mt-6 rounded-3xl border border-line bg-white p-4">
        <Skeleton className="mb-4 h-4 w-40" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-t border-line/60 py-3 first:border-0">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
