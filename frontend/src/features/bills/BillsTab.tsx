import { type FormEvent, useState } from 'react'
import { billsApi } from '../../api/modules'
import { hasRealmRole } from '../../auth/session'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import {
  parseAmount,
  parsePositiveId,
} from '../../shared/form-utils'

interface IdInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function IdInput({ label, value, onChange }: IdInputProps) {
  return (
      <label>
        {label}
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            autoComplete="off"
            required
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
      </label>
  )
}

export function BillsTab({
                           isBusy,
                           executeAction,
                           isAdmin,
                         }: TabProps) {
  const [billId, setBillId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [openingAccountId, setOpeningAccountId] = useState('')
  const [batchAccountId, setBatchAccountId] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [depositBillId, setDepositBillId] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  const canUseSandbox =
      isAdmin || hasRealmRole('employee')

  const getBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Счёт получен', () =>
        billsApi.getBill(parsePositiveId(billId, 'ID счёта')),
    )
  }

  const getBills = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Счета клиента получены', () =>
        billsApi.getBillsByAccount(
            parsePositiveId(accountId, 'ID клиента'),
        ),
    )
  }

  const openBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Счёт открыт', async () => {
      const ownerId = parsePositiveId(
          openingAccountId,
          'ID клиента',
      )

      const createdId = await billsApi.createBill({
        accountId: ownerId,
        amount: 0,
        overdraftEnabled: false,
      })

      setBillId(String(createdId))
      setAccountId(String(ownerId))

      return {
        billId: createdId,
        message: 'Счёт открыт с нулевым балансом без овердрафта.',
      }
    })
  }

  const openBatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Счета открыты', async () => {
      const count = parsePositiveId(batchCount, 'Количество')

      if (count > 20) {
        throw new Error('Можно открыть не более 20 счетов за запрос.')
      }

      const ownerId = parsePositiveId(
          batchAccountId,
          'ID клиента',
      )

      const ids = await billsApi.createBillsForAccount(
          ownerId,
          Array.from({ length: count }, () => ({
            amount: 0,
            overdraftEnabled: false,
          })),
      )

      setAccountId(String(ownerId))

      return { accountId: ownerId, billIds: ids }
    })
  }

  const deposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Sandbox-пополнение выполнено', () =>
        billsApi.depositBill({
          billId: parsePositiveId(depositBillId, 'ID счёта'),
          amount: parseAmount(depositAmount, 'Сумма'),
        }),
    )
  }

  return (
      <div className="forms-grid" aria-busy={isBusy}>
        <ActionCard
            title="Получить счёт"
            description="Просмотр счёта по идентификатору."
            submitLabel="Получить"
            isBusy={isBusy}
            onSubmit={getBill}
        >
          <fieldset disabled={isBusy}>
            <IdInput label="ID счёта" value={billId} onChange={setBillId} />
          </fieldset>
        </ActionCard>

        <ActionCard
            title="Счета клиента"
            description="Список счетов выбранного клиента."
            submitLabel="Получить список"
            isBusy={isBusy}
            onSubmit={getBills}
        >
          <fieldset disabled={isBusy}>
            <IdInput
                label="ID клиента"
                value={accountId}
                onChange={setAccountId}
            />
          </fieldset>
        </ActionCard>

        <ActionCard
            title="Открыть счёт"
            description="Нулевой начальный баланс, овердрафт отключён."
            submitLabel="Открыть"
            isBusy={isBusy}
            onSubmit={openBill}
        >
          <fieldset disabled={isBusy}>
            <IdInput
                label="ID клиента"
                value={openingAccountId}
                onChange={setOpeningAccountId}
            />
          </fieldset>
        </ActionCard>

        <ActionCard
            title="Открыть несколько счетов"
            description="От 1 до 20 счетов с нулевым балансом."
            submitLabel="Открыть счета"
            isBusy={isBusy}
            onSubmit={openBatch}
        >
          <fieldset disabled={isBusy}>
            <IdInput
                label="ID клиента"
                value={batchAccountId}
                onChange={setBatchAccountId}
            />

            <label>
              Количество
              <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  required
                  value={batchCount}
                  onChange={(event) => setBatchCount(event.target.value)}
              />
            </label>
          </fieldset>
        </ActionCard>

        {canUseSandbox ? (
            <ActionCard
                title="Sandbox-пополнение"
                description="Только демонстрационное зачисление. Требует включения sandbox на сервере."
                submitLabel="Зачислить тестовые средства"
                isBusy={isBusy}
                onSubmit={deposit}
            >
              <fieldset disabled={isBusy}>
                <IdInput
                    label="ID счёта"
                    value={depositBillId}
                    onChange={setDepositBillId}
                />

                <label>
                  Сумма
                  <input
                      type="text"
                      inputMode="decimal"
                      required
                      autoComplete="off"
                      placeholder="100.00"
                      value={depositAmount}
                      onChange={(event) =>
                          setDepositAmount(event.target.value)
                      }
                  />
                </label>

                <p className="muted">
                  Это не подтверждение поступления реальных денег.
                  При потере ответа не повторяйте запрос вслепую.
                </p>
              </fieldset>
            </ActionCard>
        ) : null}
      </div>
  )
}