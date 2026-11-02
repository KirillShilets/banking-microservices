import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUpRight, Landmark, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from '../account/AccountProvider'
import { useOpenBill } from '../account/mutations'
import { billDisplayName } from './bill-format'
import type { BillResponseDTO } from '../../dto/response'
import { formatDate } from '../../lib/date'
import { toMessage } from '../../lib/errors'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { CopyButton } from '../../components/ui/copy-button'
import { Modal } from '../../components/ui/modal'
import { Money } from '../../components/ui/money'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'
import { isStaff, useAuthUser } from '../../auth'

interface BillDetailsDialogProps {
  bill: BillResponseDTO | null
  onClose: () => void
}

export function BillDetailsDialog({ bill, onClose }: BillDetailsDialogProps) {
  const user = useAuthUser()
  const navigate = useNavigate()
  // navigate() returns a promise in data routers; a rejection means the target
  // route failed, so it is shown to the user instead of being dropped.
  const toast = useToast()

  const openPayments = (to: string) => {
    onClose()
    void Promise.resolve(navigate(to)).catch(() => {
      toast.error('Не удалось открыть страницу платежей')
    })
  }

  if (!bill) {
    return (
      <Modal open={false} onClose={onClose}>
        <span />
      </Modal>
    )
  }

  return (
    <Modal
      open={Boolean(bill)}
      onClose={onClose}
      title={billDisplayName(bill)}
      description={`Счёт № ${bill.billId}`}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Закрыть
          </Button>
          {isStaff(user) ? (
            <Button
              onClick={() => openPayments(`/payments?tab=topup&bill=${bill.billId}`)}
            >
              Пополнить
            </Button>
          ) : (
            <Button
              leadingIcon={<ArrowUpRight className="h-4 w-4" />}
              onClick={() => openPayments('/payments?tab=requisites')}
            >
              Реквизиты
            </Button>
          )}
        </div>
      }
    >
      <div className="rounded-2xl bg-navy p-5 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
          Баланс счёта
        </p>
        <Money
          amount={bill.amount}
          hideZeroFraction
          tone="inherit"
          className="mt-1 block text-[33px] font-extrabold tracking-[-0.045em]"
        />
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="lime">{bill.isDefault ? 'Основной' : 'Дополнительный'}</Badge>
          <Badge variant="dark" className="border border-white/15">
            {bill.overdraftEnabled ? 'Овердрафт' : 'Без овердрафта'}
          </Badge>
        </div>
      </div>

      <div className="mt-5 space-y-1">
        <DetailRow
          label="Номер счёта"
          value={
            <span className="flex items-center gap-1">
              <span className="font-mono text-[13px]">{bill.billId}</span>
              <CopyButton value={String(bill.billId)} label="Скопировать номер счёта" />
            </span>
          }
        />
        <DetailRow label="Профиль" value={`ID ${bill.accountId}`} />
        <DetailRow label="Открыт" value={formatDate(bill.creationDate)} />
        <DetailRow label="Валюта" value="RUB · Российский рубль" />
        <DetailRow
          label="Статус"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
              Активен
            </span>
          }
        />
      </div>

      <p className="mt-5 rounded-xl bg-surface-soft p-3 text-[12.5px] leading-relaxed text-muted">
        {isStaff(user)
          ? 'Тестовое пополнение доступно сотрудникам и администраторам. Реальные денежные средства не используются.'
          : 'Пополнение счёта выполняется банковским переводом по реквизитам профиля.'}
      </p>
    </Modal>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2.5 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="flex items-center text-right text-[13.5px] font-semibold text-ink">
        {value}
      </span>
    </div>
  )
}

interface OpenBillDialogProps {
  open: boolean
  onClose: () => void
  onOpened?: () => void
}

export function OpenBillDialog({ open, onClose, onOpened }: OpenBillDialogProps) {
  const { accountId, needsAccountLink } = useAccount()
  const openBill = useOpenBill(accountId)
  const toast = useToast()
  const [count, setCount] = useState('1')

  const handleClose = () => {
    setCount('1')
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const billCount = Number(count)

    if (!Number.isInteger(billCount) || billCount < 1 || billCount > 20) {
      toast.error('Некорректное количество счетов')
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
        `${billCount === 1 ? 'Номер' : 'Номера'}: ${ids.join(', ')}`,
      )
      onOpened?.()
      handleClose()
    } catch (error) {
      toast.error('Не удалось открыть счёт', toMessage(error))
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Новый счёт"
      description="Счёт открывается с нулевым балансом. Овердрафт можно подключить позже."
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={openBill.isPending}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="open-bill-form"
            loading={openBill.isPending}
            leadingIcon={<Plus className="h-4 w-4" />}
            disabled={!accountId || needsAccountLink}
          >
            Открыть
          </Button>
        </div>
      }
    >
      {!accountId || needsAccountLink ? (
        <p className="rounded-xl bg-amber-soft p-3 text-[13px] text-amber">
          Сначала привяжите счёт к профилю.
        </p>
      ) : (
        <form id="open-bill-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            <p className="text-[13px] leading-relaxed text-muted">
              Каждый счёт — отдельный баланс и реквизиты. Вы сможете пополнять
              его независимо от остальных.
            </p>
          </div>

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
        </form>
      )}
    </Modal>
  )
}
