import { useState, type FormEvent } from 'react'
import { CircleAlert, Landmark, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount } from '../account/AccountProvider'
import { useCreateAccount } from '../account/mutations'
import { billsApi } from '../../api/modules'
import {
  normalizePhoneInput,
  validateEmail,
  validateName,
  validatePhone,
} from '../../lib/validation'
import { toMessage } from '../../lib/errors'
import { useAuthUser } from '../../auth'
import { queryKeys } from '../../api/query-keys'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'

interface CreateAccountDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateAccountDialog({ open, onClose }: CreateAccountDialogProps) {
  const user = useAuthUser()
  const { setAccountId, refetch } = useAccount()
  const createAccount = useCreateAccount()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [name, setName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState('+375291234567')
  const [billCount, setBillCount] = useState('1')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Bills are opened asynchronously by bill-service after the account command.
  // Keep polling briefly after onboarding so the dashboard fills itself instead
  // of showing "0 счетов" until the customer reloads the page.
  const waitForBills = async (createdAccountId: number) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000))

      try {
        const bills = await billsApi.getBillsByAccount(createdAccountId)
        if (bills.length > 0) break
      } catch {
        break
      }
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })
  }

  const handleClose = () => {
    setName(user.displayName)
    setEmail(user.email)
    setPhone('+375291234567')
    setBillCount('1')
    setErrors({})
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}
    const nameCheck = validateName(name)
    const emailCheck = validateEmail(email)
    const phoneCheck = validatePhone(phone)
    const count = Number(billCount)

    if (!nameCheck.valid && nameCheck.message) nextErrors.name = nameCheck.message
    if (!emailCheck.valid && emailCheck.message) nextErrors.email = emailCheck.message
    if (!phoneCheck.valid && phoneCheck.message) nextErrors.phone = phoneCheck.message
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      nextErrors.bills = 'Выберите от 1 до 20 счетов'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const accountId = await createAccount.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bills: Array.from({ length: count }, () => ({
          amount: '0.00',
          overdraftEnabled: false,
        })),
      })

      setAccountId(accountId)
      await refetch()
      void waitForBills(accountId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.bills.all })

      toast.success(
        'Профиль создан',
        'Счета открываются. Если список пуст, обновите его через несколько секунд.',
      )
      handleClose()
    } catch (error) {
      toast.error('Не удалось создать профиль', toMessage(error))
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Открыть профиль в Lumen"
      description="Профиль создаётся один раз. Начальные счета открываются с нулевым балансом."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={createAccount.isPending}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="create-account-form"
            loading={createAccount.isPending}
            leadingIcon={<Plus className="h-4 w-4" />}
          >
            Создать профиль
          </Button>
        </div>
      }
    >
      <form id="create-account-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
            <Landmark className="h-4.5 w-4.5" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted">
            Имя, email и телефон можно изменить позже в профиле. ID профиля
            сохранится на этом устройстве.
          </p>
        </div>

        <Input
          label="Имя и фамилия"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          autoComplete="name"
          placeholder="Кира Воронцова"
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />

        <Input
          label="Телефон"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(normalizePhoneInput(event.target.value))}
          error={errors.phone}
          autoComplete="tel"
          placeholder="+375291234567"
          hint="Формат: +375XXXXXXXXX, 10–15 цифр"
        />

        <Select
          label="Сколько счетов открыть"
          value={billCount}
          onChange={(event) => setBillCount(event.target.value)}
          error={errors.bills}
          hint="Первый счёт станет основным. Овердрафт подключается позже."
        >
          {[1, 2, 3, 4, 5].map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'счёт' : 'счёта'}
            </option>
          ))}
        </Select>

        {createAccount.isError ? (
          <div className="flex items-start gap-2 rounded-xl bg-rose-soft p-3 text-[13px] text-rose">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{toMessage(createAccount.error)}</span>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
