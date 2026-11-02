import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CircleCheck,
  Copy,
  CreditCard,
  Info,
  Landmark,
  Link2,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { depositsApi } from '../../api/modules'
import { isStaff, useAuthUser } from '../../auth'
import { useAccount } from '../../features/account/AccountProvider'
import { useOpenBill, useSandboxDeposit } from '../../features/account/mutations'
import { CreateAccountDialog } from '../../features/account/CreateAccountDialog'
import { LinkAccountDialog } from '../../features/account/LinkAccountDialog'
import { useBills, summariseBills } from '../../features/bills/use-bills'
import { billDisplayName } from '../../features/bills/bill-format'
import { recordActivity } from '../../features/activity/activity-store'
import type { BillDepositResponseDTO, DepositResponseDTO } from '../../dto/response'
import type { BillResponseDTO } from '../../dto/response'
import {
  formatDateTime,
  formatShortDate,
} from '../../lib/date'
import { formatMoney, minorToDecimal, toMinorUnits } from '../../lib/money'
import { normalizeMoneyInput } from '../../lib/validation'
import { toMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { CopyButton } from '../../components/ui/copy-button'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { Input } from '../../components/ui/input'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import {
  SegmentedControl,
  type SegmentOption,
} from '../../components/ui/segmented-control'
import { Select } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toast'

type PaymentTab = 'topup' | 'new' | 'requisites' | 'deposit'

const MIN_DEPOSIT = 2.6

const TAB_OPTIONS: SegmentOption<PaymentTab>[] = [
  { value: 'topup', label: 'Пополнение', icon: ArrowDownToLine },
  { value: 'new', label: 'Новый счёт', icon: Plus },
  { value: 'requisites', label: 'Реквизиты', icon: CreditCard },
]

const STAFF_TAB_OPTION: SegmentOption<PaymentTab> = {
  value: 'deposit',
  label: 'Депозит',
  icon: Search,
}

export function PaymentsPage() {
  const user = useAuthUser()
  const staff = isStaff(user)
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    account,
    accountId,
    isLoading,
    isAccountMissing,
    needsAccountLink,
    error,
    refetch,
  } = useAccount()

  const billsQuery = useBills()
  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data])
  const summary = useMemo(() => summariseBills(bills), [bills])

  const activeTab = resolveTab(searchParams.get('tab'), staff)
  const [selectedBillId, setSelectedBillId] = useState('')
  const preferredBillId = searchParams.get('bill')

  const resolvedBillId = useMemo(() => {
    if (selectedBillId && bills.some((bill) => String(bill.billId) === selectedBillId)) {
      return selectedBillId
    }

    if (
      preferredBillId &&
      bills.some((bill) => String(bill.billId) === preferredBillId)
    ) {
      return preferredBillId
    }

    return summary.defaultBill
      ? String(summary.defaultBill.billId)
      : bills[0]
        ? String(bills[0].billId)
        : ''
  }, [bills, preferredBillId, selectedBillId, summary.defaultBill])

  const selectedBill =
    bills.find((bill) => String(bill.billId) === resolvedBillId) ?? null

  const [createOpen, setCreateOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  const setTab = (next: PaymentTab) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  if (isLoading) {
    return <PaymentsSkeleton />
  }

  if (error && !isAccountMissing) {
    return (
      <Card className="mt-2">
        <ErrorState
          title="Не удалось загрузить платёжные данные"
          description={toMessage(error)}
          onRetry={() => void refetch()}
        />
      </Card>
    )
  }

  if (isAccountMissing || needsAccountLink) {
    return (
      <>
        <PageHeader
          eyebrow="Платежи"
          title="Платежи и счета"
          description="Пополнение, новые счета и реквизиты."
        />
        <Card>
          <EmptyState
            icon={Link2}
            title={isAccountMissing ? 'Сначала создайте профиль' : 'Счёт не привязан'}
            description={
              isAccountMissing
                ? 'После создания профиля появятся счета и возможность пополнения.'
                : 'Привяжите номер счёта, чтобы работать с платежами.'
            }
            action={
              <Button
                onClick={() => {
                  if (isAccountMissing) setCreateOpen(true)
                  else setLinkOpen(true)
                }}
              >
                {isAccountMissing ? 'Создать профиль' : 'Привязать счёт'}
              </Button>
            }
          />
        </Card>
        <CreateAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
        <LinkAccountDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
      </>
    )
  }

  if (billsQuery.isPending) {
    return <PaymentsSkeleton />
  }

  if (billsQuery.isError) {
    return (
      <>
        <PageHeader
          eyebrow="Платежи"
          title="Платежи и счета"
          description="Пополнение, новые счета и реквизиты."
        />
        <Card>
          <ErrorState
            title="Не удалось загрузить счета"
            description={toMessage(billsQuery.error)}
            onRetry={() => void billsQuery.refetch()}
          />
        </Card>
      </>
    )
  }

  const tabs: SegmentOption<PaymentTab>[] = staff
    ? [...TAB_OPTIONS, STAFF_TAB_OPTION]
    : TAB_OPTIONS

  return (
    <>
      <PageHeader
        eyebrow="Платежи"
        title="Платежи и счета"
        description="Пополняйте счёт, открывайте новые счета и копируйте реквизиты."
      />

      <SegmentedControl
        value={activeTab}
        onChange={(next) => setTab(next)}
        options={tabs}
        ariaLabel="Раздел платежей"
        className="mb-5 max-w-2xl"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
        <div className="min-w-0">
          {activeTab === 'topup' ? (
            staff ? (
              <TopUpPanel
                bills={bills}
                selectedBillId={resolvedBillId}
                onSelectBill={setSelectedBillId}
                accountEmail={account?.email ?? user.email}
                accountId={accountId}
                subject={user.subject}
              />
            ) : (
              <CustomerTopUpPanel
                bill={selectedBill}
                accountName={account?.name ?? user.displayName}
                onOpenRequisites={() => setTab('requisites')}
              />
            )
          ) : null}

          {activeTab === 'new' ? (
            <NewBillPanel accountId={accountId} onOpenAccounts={() => setTab('requisites')} />
          ) : null}

          {activeTab === 'requisites' ? (
            <RequisitesPanel
              account={account}
              bill={selectedBill}
              bills={bills}
              onSelectBill={setSelectedBillId}
            />
          ) : null}

          {activeTab === 'deposit' && staff ? <DepositLookupPanel /> : null}
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
                  Доступно на основном
                </p>
                <Money
                  amount={summary.defaultBill?.amount ?? '0.00'}
                  hideZeroFraction
                  className="mt-1.5 block text-[27px] font-extrabold tracking-[-0.045em] text-ink"
                />
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
                <Wallet className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-1 text-[12.5px] text-muted">
              {summary.defaultBill
                ? `${billDisplayName(summary.defaultBill)} · № ${summary.defaultBill.billId}`
                : 'Счёт ещё не открыт'}
            </p>

            <div className="mt-4 space-y-2 border-t border-line/70 pt-3 text-[12.5px]">
              <SummaryRow label="Всего счетов" value={String(bills.length)} />
              <SummaryRow label="Валюта" value="RUB" />
              <SummaryRow
                label="Тестовое"
                value={staff ? 'Доступен' : 'Только сотрудники'}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              leadingIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
              onClick={() => setTab('requisites')}
            >
              Перейти к реквизитам
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint-soft text-emerald">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink">Защищённая операция</p>
                <p className="text-[11.5px] text-muted">Bearer JWT · Keycloak</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Каждый запрос подписан access-токеном. При 401 клиент обновляет
              сессию один раз, затем просит войти снова.
            </p>
          </Card>

          {!staff ? (
            <Card variant="soft" className="p-5">
              <p className="text-[13px] font-bold text-ink">Как пополнить счёт</p>
              <ol className="mt-3 space-y-2.5">
                {[
                  'Скопируйте номер счёта во вкладке «Реквизиты».',
                  'Сделайте перевод из другого банка.',
                  'Зачисление появится в истории операций.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-bold text-ink">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </aside>
      </div>
      <CreateAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <LinkAccountDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  )
}

function resolveTab(value: string | null, staff: boolean): PaymentTab {
  if (value === 'new' || value === 'requisites') return value
  if (value === 'deposit' && staff) return 'deposit'
  return 'topup'
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

interface TopUpPanelProps {
  bills: BillResponseDTO[]
  selectedBillId: string
  onSelectBill: (billId: string) => void
  accountEmail: string
  accountId: number | null
  subject: string
}

function TopUpPanel({
  bills,
  selectedBillId,
  onSelectBill,
  accountEmail,
  accountId,
  subject,
}: TopUpPanelProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const deposit = useSandboxDeposit(accountId)
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState('')
  const [receipt, setReceipt] = useState<{
    deposit: BillDepositResponseDTO
    newBalance: string
  } | null>(null)

  const selectedBill = bills.find((bill) => String(bill.billId) === selectedBillId)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = normalizeMoneyInput(amount)
    if (!normalized.value) {
      setAmountError(normalized.error ?? 'Укажите сумму')
      return
    }

    if (Number(normalized.value) < MIN_DEPOSIT) {
      setAmountError(`Минимальная сумма — ${formatMoney(MIN_DEPOSIT)}`)
      return
    }

    if (!selectedBill) {
      toast.error('Выберите счёт для зачисления')
      return
    }

    try {
      const result = await deposit.mutateAsync({
        billId: selectedBill.billId,
        amount: normalized.value,
      })

      recordActivity(subject, {
        kind: 'deposit',
        title: 'Пополнение счёта',
        counterparty: 'Lumen Bank',
        amount: result.amount,
        billId: result.billId,
        category: 'topup',
        status: 'completed',
      })

      const newBalance = minorToDecimal(
        toMinorUnits(selectedBill.amount) + toMinorUnits(result.amount),
      )

      setReceipt({ deposit: result, newBalance })
      setAmount('')
      setAmountError('')
      toast.success(
        'Счёт пополнен',
        `${formatMoney(result.amount)} зачислено на № ${result.billId}`,
      )
    } catch (error) {
      toast.error('Не удалось пополнить счёт', toMessage(error))
    }
  }

  if (receipt) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center bg-surface-soft px-5 py-8 text-center">
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
              className="grid h-16 w-16 place-items-center rounded-full bg-lime text-ink"
            >
              <CircleCheck className="h-8 w-8" />
            </motion.span>

            <p className="mt-4 text-[14px] font-semibold text-muted">Зачислено</p>
            <Money
              amount={receipt.deposit.amount}
              tone="inherit"
              className="mt-1 text-[37px] font-extrabold tracking-[-0.05em] text-ink"
            />
            <p className="mt-1 text-[13px] text-muted">
              Счёт № {receipt.deposit.billId} · Lumen Bank
            </p>
          </div>

          <div className="p-5">
            <div className="space-y-0.5">
              <DetailRow label="Счёт зачисления" value={`№ ${receipt.deposit.billId}`} />
              <DetailRow
                label="Новый баланс"
                value={
                  <Money
                    amount={receipt.newBalance}
                    hideZeroFraction
                    className="font-bold"
                  />
                }
              />
              <DetailRow label="Email чека" value={receipt.deposit.email} />
              <DetailRow
                label="Дата"
                value={formatDateTime(receipt.deposit.creationDate)}
              />
              <DetailRow
                label="Статус"
                value={<Badge variant="mint">Выполнено</Badge>}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setReceipt(null)}
                leadingIcon={<Plus className="h-4 w-4" />}
              >
                Ещё пополнение
              </Button>
              <Button className="flex-1" onClick={() => navigate('/history')}>
                История операций
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
              Пополнение счёта
            </h2>
            <Badge variant="lime">Тестовый режим</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Тестовое зачисление для ролей employee и admin. Реальные деньги не
            используются.
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
          <ArrowDownToLine className="h-5 w-5" />
        </span>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-5">
        <fieldset>
          <legend className="text-[13px] font-semibold text-ink-soft">
            Счёт зачисления
          </legend>

          {bills.length === 0 ? (
            <p className="mt-2 rounded-xl bg-amber-soft p-3 text-[13px] text-amber">
              Счетов нет. Сначала откройте счёт в разделе «Новый счёт».
            </p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {bills.map((bill) => {
                const active = bill.billId === selectedBill?.billId

                return (
                  <button
                    key={bill.billId}
                    type="button"
                    onClick={() => onSelectBill(String(bill.billId))}
                    aria-pressed={active}
                    className={cn(
                      'rounded-2xl border p-3.5 text-left transition-colors duration-200',
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-white hover:border-line-strong hover:bg-surface-soft',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[12px] font-bold',
                          active ? 'text-white/60' : 'text-muted',
                        )}
                      >
                        {bill.isDefault ? 'Основной' : 'Дополнительный'}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 text-lime" /> : null}
                    </span>
                    <span
                      className={cn(
                        'mt-1 block text-[13px] font-semibold',
                        active ? 'text-white/80' : 'text-ink',
                      )}
                    >
                      № {bill.billId}
                    </span>
                    <Money
                      amount={bill.amount}
                      hideZeroFraction
                      tone="inherit"
                      className={cn(
                        'mt-1 block text-[14px] font-bold',
                        active ? 'text-white' : 'text-ink',
                      )}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>

        <div>
          <Input
            label="Сумма пополнения"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setAmountError('')
            }}
            error={amountError}
            inputMode="decimal"
            placeholder="0,00"
            hint={`Минимум ${formatMoney(MIN_DEPOSIT)} · чек придёт на ${accountEmail}`}
            className="h-14 text-[25px] font-extrabold tracking-[-0.04em]"
            trailing={<span className="pr-2 text-[20px] font-bold text-muted">₽</span>}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[1000, 5000, 10000, 50000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset.toLocaleString('ru-RU'))
                setAmountError('')
              }}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              {preset.toLocaleString('ru-RU')} ₽
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-[12.5px] leading-relaxed text-muted">
              Тестовое пополнение не создаёт реальной транзакции. Оно удобно для
              проверки сценариев на стенде и доступно только сотрудникам банка.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={deposit.isPending}
          disabled={bills.length === 0}
          leadingIcon={<ArrowDownToLine className="h-4 w-4" />}
        >
          Пополнить счёт
        </Button>
      </form>
    </Card>
  )
}

function CustomerTopUpPanel({
  bill,
  accountName,
  onOpenRequisites,
}: {
  bill: BillResponseDTO | null
  accountName: string
  onOpenRequisites: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative overflow-hidden bg-navy p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-lime/20 blur-3xl" />
        <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lime">
          <Landmark className="h-5 w-5" />
        </span>
        <h2 className="relative mt-4 text-[25px] font-extrabold tracking-[-0.04em]">
          Пополнение переводом
        </h2>
        <p className="relative mt-2 max-w-md text-[13.5px] leading-relaxed text-white/55">
          В демо-стенде пополнение доступно сотрудникам. Клиент может перевести
          средства на счёт по реквизитам — зачисление появится в истории.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-soft p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              Получатель
            </p>
            <p className="mt-1 text-[14px] font-bold text-ink">{accountName}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {bill ? `Счёт № ${bill.billId}` : 'Счёт ещё не открыт'}
            </p>
          </div>
          <Badge variant="mint">RUB</Badge>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-cobalt-soft p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" />
          <p className="text-[12.5px] leading-relaxed text-[#33439c]">
            Скопируйте номер счёта и укажите его как назначение платежа. Внешние
            переводы в демо-стенде не проводятся автоматически.
          </p>
        </div>

        <Button
          className="mt-5 w-full"
          leadingIcon={<CreditCard className="h-4 w-4" />}
          onClick={onOpenRequisites}
        >
          Открыть реквизиты
        </Button>
      </div>
    </Card>
  )
}

function NewBillPanel({
  accountId,
  onOpenAccounts,
}: {
  accountId: number | null
  onOpenAccounts: () => void
}) {
  const toast = useToast()
  const openBill = useOpenBill(accountId)
  const [count, setCount] = useState('1')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const billCount = Number(count)

    if (!Number.isInteger(billCount) || billCount < 1 || billCount > 20) {
      toast.error('Выберите от 1 до 20 счетов')
      return
    }

    try {
      const ids = await openBill.mutateAsync(
        Array.from({ length: billCount }, () => ({
          amount: '0.00',
          overdraftEnabled: false,
        })),
      )

      toast.success(
        billCount === 1 ? 'Счёт открыт' : 'Счета открыты',
        `ID: ${ids.join(', ')}`,
      )
      setCount('1')
    } catch (error) {
      toast.error('Не удалось открыть счёт', toMessage(error))
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
            Новый счёт
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Отдельный баланс и реквизиты. Стартовый баланс — 0 ₽.
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-emerald">
          <Plus className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Баланс', value: '0 ₽' },
          { label: 'Овердрафт', value: 'Позже' },
          { label: 'Реквизиты', value: 'Отдельные' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-line bg-surface-soft p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">
              {item.label}
            </p>
            <p className="mt-1 text-[13.5px] font-bold text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
        <Select
          label="Количество счетов"
          value={count}
          onChange={(event) => setCount(event.target.value)}
          hint="За одну операцию можно открыть до 20 счетов."
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'счёт' : 'счёта'}
            </option>
          ))}
        </Select>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={openBill.isPending}
          disabled={!accountId}
          leadingIcon={<Plus className="h-4 w-4" />}
        >
          Открыть счёт
        </Button>

        <button
          type="button"
          onClick={onOpenAccounts}
          className="flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Посмотреть реквизиты существующих счетов
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </form>
    </Card>
  )
}

function RequisitesPanel({
  account,
  bill,
  bills,
  onSelectBill,
}: {
  account: { name: string; email: string; phone: string; ownerSubject: string } | null
  bill: BillResponseDTO | null
  bills: BillResponseDTO[]
  onSelectBill: (billId: string) => void
}) {
  const toast = useToast()
  const navigate = useNavigate()

  const copyAll = async () => {
    if (!account) return

    const text = [
      `Получатель: ${account.name}`,
      `Счёт: ${bill ? bill.billId : '—'}`,
      'Банк: Lumen Bank',
      `Email: ${account.email}`,
      `Телефон: ${account.phone}`,
      `Назначение: перевод на счёт ${bill ? bill.billId : '—'}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Реквизиты скопированы')
    } catch {
      toast.error('Не удалось скопировать реквизиты')
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative overflow-hidden bg-navy p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-mint/15 blur-3xl" />
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
          Реквизиты для перевода
        </p>
        <h2 className="mt-2 text-[25px] font-extrabold tracking-[-0.04em]">
          {account?.name ?? 'Профиль Lumen'}
        </h2>
        <p className="mt-1 font-mono text-[13px] text-white/50">
          {account?.ownerSubject ?? '—'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="lime">Lumen Bank</Badge>
          <Badge variant="dark" className="border border-white/15">
            RUB
          </Badge>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {bills.length > 1 ? (
          <div className="mb-5">
            <p className="mb-2 text-[12px] font-semibold text-ink-soft">
              Выберите счёт
            </p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {bills.map((item) => (
                <button
                  key={item.billId}
                  type="button"
                  onClick={() => onSelectBill(String(item.billId))}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                    item.billId === bill?.billId
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-white text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  № {item.billId}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-0.5">
          <RequisiteRow label="Получатель" value={account?.name ?? '—'} copyValue={account?.name} />
          <RequisiteRow
            label="Номер счёта"
            value={bill ? String(bill.billId) : '—'}
            copyValue={bill ? String(bill.billId) : undefined}
            mono
          />
          <RequisiteRow label="Банк" value="Lumen Bank" copyValue="Lumen Bank" />
          <RequisiteRow
            label="Email"
            value={account?.email ?? '—'}
            copyValue={account?.email}
          />
          <RequisiteRow
            label="Телефон"
            value={account?.phone ?? '—'}
            copyValue={account?.phone}
          />
          <RequisiteRow
            label="Назначение платежа"
            value={`Перевод на счёт ${bill ? bill.billId : '—'}`}
            copyValue={`Перевод на счёт ${bill ? bill.billId : '—'}`}
          />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            leadingIcon={<Copy className="h-4 w-4" />}
            onClick={() => void copyAll()}
          >
            Скопировать реквизиты
          </Button>
          {bill ? (
            <Button
              variant="secondary"
              className="flex-1"
              leadingIcon={<ReceiptText className="h-4 w-4" />}
              onClick={() => navigate(`/history?bill=${bill.billId}`)}
            >
              История по счёту
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-surface-soft p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[12.5px] leading-relaxed text-muted">
            Для внешнего перевода используйте номер счёта и имя получателя. В
            production реквизиты приходят из банковского сервиса.
          </p>
        </div>
      </div>
    </Card>
  )
}

function RequisiteRow({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string
  value: string
  copyValue?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-3 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="flex items-center gap-1">
        <span
          className={cn(
            'text-right text-[13.5px] font-semibold text-ink',
            mono ? 'font-mono' : undefined,
          )}
        >
          {value}
        </span>
        {copyValue ? <CopyButton value={copyValue} label={`Скопировать: ${label}`} /> : null}
      </span>
    </div>
  )
}

function DepositLookupPanel() {
  const toast = useToast()
  const lookup = useMutation({
    mutationFn: (depositId: number) => depositsApi.getDeposit(depositId),
  })
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<DepositResponseDTO | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = value.trim()

    if (!/^\d+$/.test(normalized)) {
      setError('Введите числовой ID депозита')
      return
    }

    const depositId = Number(normalized)
    if (!Number.isSafeInteger(depositId) || depositId <= 0) {
      setError('ID вне допустимого диапазона')
      return
    }

    setError('')
    setResult(null)

    try {
      const deposit = await lookup.mutateAsync(depositId)
      setResult(deposit)
      toast.success('Депозит найден')
    } catch (lookupError) {
      setError(toMessage(lookupError))
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-extrabold tracking-[-0.03em] text-ink">
              Проверка депозита
            </h2>
            <Badge variant="cobalt">employee</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            Поиск записи по ID через `GET /deposits/{'{depositId}'}`.
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cobalt-soft text-cobalt">
          <Search className="h-5 w-5" />
        </span>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="ID депозита"
          value={value}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, '').slice(0, 12))
            setError('')
          }}
          error={error}
          inputMode="numeric"
          placeholder="Например, 9001"
          containerClassName="flex-1"
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <Button
          type="submit"
          loading={lookup.isPending}
          leadingIcon={<Search className="h-4 w-4" />}
          className="sm:mb-[26px]"
        >
          Найти
        </Button>
      </form>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 rounded-2xl border border-line bg-surface-soft p-4"
        >
          <div className="flex items-center justify-between">
            <Badge variant="mint">Найден</Badge>
            <span className="text-[12px] text-muted">
              {formatShortDate(result.creationDate)}
            </span>
          </div>

          <Money
            amount={result.amount}
            className="mt-3 block text-[29px] font-extrabold tracking-[-0.045em] text-ink"
          />

          <div className="mt-3 space-y-0.5">
            <DetailRow label="Счёт" value={`№ ${result.billId}`} />
            <DetailRow label="Email" value={result.email} />
            <DetailRow label="Создан" value={formatDateTime(result.creationDate)} />
          </div>
        </motion.div>
      ) : null}

      {lookup.isError ? (
        <p className="mt-4 rounded-xl bg-rose-soft p-3 text-[13px] text-rose">
          {toMessage(lookup.error)}
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Депозиты создаются асинхронно после тестовых пополнений. В демо-базе
        доступны записи 9001 и 9002.
      </p>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  )
}

function PaymentsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка платежей">
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <Skeleton className="mb-5 h-11 w-full max-w-md rounded-full" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <Skeleton className="h-[460px] rounded-3xl" />
        <Skeleton className="h-[280px] rounded-3xl" />
      </div>
    </div>
  )
}
