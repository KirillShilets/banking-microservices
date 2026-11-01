import { useState } from 'react'
import { Landmark, Link2, Plus, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isStaff, useAuthUser } from '../../auth'
import { useAccount } from '../../features/account/AccountProvider'
import { CreateAccountDialog } from '../../features/account/CreateAccountDialog'
import { LinkAccountDialog } from '../../features/account/LinkAccountDialog'
import { useBills, summariseBills } from '../../features/bills/use-bills'
import { BillCard, BillCardSkeleton } from '../../features/bills/BillCard'
import { BillDetailsDialog, OpenBillDialog } from '../../features/bills/BillDialogs'
import type { BillResponseDTO } from '../../dto/response'
import { minorToDecimal } from '../../lib/money'
import { toMessage } from '../../lib/errors'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'

export function AccountsPage() {
  const user = useAuthUser()
  const {
    account,
    isLoading,
    isAccountMissing,
    needsAccountLink,
    error,
    refetch,
  } = useAccount()
  const billsQuery = useBills()
  const bills = billsQuery.data ?? []
  const summary = summariseBills(bills)

  const [selectedBill, setSelectedBill] = useState<BillResponseDTO | null>(null)
  const [openBillOpen, setOpenBillOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  if (isLoading) {
    return <AccountsSkeleton />
  }

  if (error && !isAccountMissing) {
    return (
      <Card className="mt-2">
        <ErrorState
          title="Не удалось загрузить счета"
          description={toMessage(error)}
          onRetry={() => void refetch()}
        />
      </Card>
    )
  }

  if (isAccountMissing || needsAccountLink) {
    return (
      <>
        <PageHeader eyebrow="Сервисы" title="Мои счета" />
        <Card>
          <EmptyState
            icon={isAccountMissing ? Landmark : Link2}
            title={isAccountMissing ? 'Профиль ещё не создан' : 'Счёт не привязан'}
            description={
              isAccountMissing
                ? 'Создайте профиль, чтобы открыть первый счёт в Lumen Bank.'
                : 'Введите номер счёта, чтобы увидеть балансы и реквизиты.'
            }
            action={
              <Button
                leadingIcon={
                  isAccountMissing ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )
                }
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

  return (
    <>
      <PageHeader
        eyebrow="Сервисы"
        title="Мои счета"
        description="Балансы, реквизиты и настройки всех счетов профиля."
        actions={
          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => setOpenBillOpen(true)}
          >
            Открыть счёт
          </Button>
        }
      />

      <Card className="relative overflow-hidden bg-navy p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
              Суммарный баланс
            </p>
            <Money
              amount={minorToDecimal(summary.total)}
              tone="inherit"
              className="mt-1 block text-[35px] font-extrabold tracking-[-0.05em] sm:text-[41px]"
            />
            <p className="mt-1 text-[12.5px] text-white/40">
              {bills.length} {bills.length === 1 ? 'счёт' : 'счетов'} ·{' '}
              {account?.name ?? user.displayName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {summary.defaultBill ? (
              <Badge variant="dark" className="border border-white/15">
                Основной · ···· {String(summary.defaultBill.billId).slice(-4)}
              </Badge>
            ) : null}
            {summary.overdraftBills.length > 0 ? (
              <Badge variant="lime">Овердрафт</Badge>
            ) : null}
            {isStaff(user) ? <Badge variant="outline">Сотрудник</Badge> : null}
          </div>
        </div>
      </Card>

      <div className="mt-5">
        {billsQuery.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <BillCardSkeleton key={index} className="w-full" />
            ))}
          </div>
        ) : billsQuery.isError ? (
          <Card>
            <ErrorState
              description={toMessage(billsQuery.error)}
              onRetry={() => void billsQuery.refetch()}
            />
          </Card>
        ) : bills.length === 0 ? (
          <Card>
            <EmptyState
              icon={Wallet}
              title="Счетов пока нет"
              description="Откройте первый счёт, чтобы принимать переводы и хранить средства."
              action={
                <Button
                  leadingIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setOpenBillOpen(true)}
                >
                  Открыть счёт
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bills.map((bill, index) => (
              <BillCard
                key={bill.billId}
                bill={bill}
                index={index}
                onOpen={setSelectedBill}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-muted">
        Номера счетов используются для внутренних переводов. Реквизиты для
        внешнего перевода доступны в разделе{' '}
        <Link to="/payments?tab=requisites" className="font-semibold text-ink underline decoration-line-strong underline-offset-2">
          Платежи
        </Link>
        .
      </p>

      <BillDetailsDialog bill={selectedBill} onClose={() => setSelectedBill(null)} />
      <OpenBillDialog
        open={openBillOpen}
        onClose={() => setOpenBillOpen(false)}
        onOpened={() => void billsQuery.refetch()}
      />
    </>
  )
}

function AccountsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка счетов">
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[130px] w-full rounded-3xl" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <BillCardSkeleton key={index} className="w-full" />
        ))}
      </div>
    </div>
  )
}
