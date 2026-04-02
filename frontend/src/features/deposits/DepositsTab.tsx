import { type FormEvent, useState } from 'react'
import { depositsApi, notificationsApi } from '../../api/modules'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import { parseAmount, parsePositiveId } from '../../shared/form-utils'

export function DepositsTab({ isBusy, executeAction }: TabProps) {
  const [createDepositBillId, setCreateDepositBillId] = useState('1')
  const [createDepositAmount, setCreateDepositAmount] = useState('25.00')
  const [createDepositEmail, setCreateDepositEmail] = useState('')
  const [lookupDepositId, setLookupDepositId] = useState('1')
  const [notificationBillId, setNotificationBillId] = useState('1')
  const [notificationAmount, setNotificationAmount] = useState('25.00')
  const [notificationEmail, setNotificationEmail] = useState('')

  const handleCreateDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Депозит создан', () =>
      depositsApi.createDeposit({
        billId: parsePositiveId(createDepositBillId, 'Bill ID'),
        amount: parseAmount(createDepositAmount, 'Сумма депозита'),
        email: createDepositEmail.trim(),
      }),
    )
  }

  const handleGetDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Депозит получен', () =>
      depositsApi.getDeposit(parsePositiveId(lookupDepositId, 'Deposit ID')),
    )
  }

  const handleSendNotification = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Уведомление отправлено', () =>
      notificationsApi.sendDepositNotification({
        billId: parsePositiveId(notificationBillId, 'Bill ID'),
        amount: parseAmount(notificationAmount, 'Сумма для уведомления'),
        email: notificationEmail.trim(),
      }),
    )
  }

  return (
    <div className="forms-grid">
      <ActionCard
        title="Создать депозит (deposit-service)"
        description="POST /deposits."
        submitLabel="Создать депозит"
        isBusy={isBusy}
        onSubmit={handleCreateDeposit}
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={createDepositBillId}
            onChange={(event) => setCreateDepositBillId(event.target.value)}
          />
        </label>
        <label>
          Сумма
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={createDepositAmount}
            onChange={(event) => setCreateDepositAmount(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={createDepositEmail}
            onChange={(event) => setCreateDepositEmail(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Получить депозит по ID"
        description="GET /deposits/{depositId}."
        submitLabel="Получить депозит"
        isBusy={isBusy}
        onSubmit={handleGetDeposit}
      >
        <label>
          Deposit ID
          <input
            type="number"
            min="1"
            required
            value={lookupDepositId}
            onChange={(event) => setLookupDepositId(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Отправить уведомление"
        description="POST /notifications/deposits."
        submitLabel="Отправить уведомление"
        isBusy={isBusy}
        onSubmit={handleSendNotification}
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={notificationBillId}
            onChange={(event) => setNotificationBillId(event.target.value)}
          />
        </label>
        <label>
          Сумма
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={notificationAmount}
            onChange={(event) => setNotificationAmount(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={notificationEmail}
            onChange={(event) => setNotificationEmail(event.target.value)}
          />
        </label>
      </ActionCard>
    </div>
  )
}
