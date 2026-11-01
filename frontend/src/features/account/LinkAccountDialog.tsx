import { useState, type FormEvent } from 'react'
import { Link2, ShieldCheck } from 'lucide-react'
import { useAccount } from './AccountProvider'
import { toMessage } from '../../lib/errors'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { useToast } from '../../components/ui/toast'

interface LinkAccountDialogProps {
  open: boolean
  onClose: () => void
}

export function LinkAccountDialog({ open, onClose }: LinkAccountDialogProps) {
  const { linkAccount } = useAccount()
  const toast = useToast()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = value.trim()

    if (!/^\d+$/.test(normalized)) {
      setError('Введите числовой номер счёта')
      return
    }

    const accountId = Number(normalized)
    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
      setError('Номер счёта вне допустимого диапазона')
      return
    }

    setBusy(true)
    setError('')

    try {
      await linkAccount(accountId)
      toast.success('Счёт привязан', 'Теперь счета и баланс доступны в кабинете.')
      onClose()
    } catch (linkError) {
      setError(toMessage(linkError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Привязать счёт"
      description="Номер счёта указан в договоре или в приветственном письме."
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Отмена
          </Button>
          <Button
            type="submit"
            form="link-account-form"
            loading={busy}
            leadingIcon={<Link2 className="h-4 w-4" />}
          >
            Привязать
          </Button>
        </div>
      }
    >
      <form id="link-account-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint-soft text-emerald">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted">
            Мы проверим, что счёт принадлежит вашему профилю, прежде чем
            сохранить его на этом устройстве.
          </p>
        </div>

        <Input
          label="Номер счёта"
          value={value}
          onChange={(event) => {
            setValue(event.target.value.replace(/\D/g, '').slice(0, 12))
            setError('')
          }}
          error={error}
          inputMode="numeric"
          autoFocus
          placeholder="Например, 1842"
        />
      </form>
    </Modal>
  )
}
