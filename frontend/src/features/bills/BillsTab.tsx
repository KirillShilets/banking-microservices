import { type FormEvent, useState } from 'react'
import { billsApi } from '../../api/modules'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import type { BillDraft } from '../../shared/form-utils'
import { parseAmount, parsePositiveId } from '../../shared/form-utils'

export function BillsTab({ isBusy, executeAction }: TabProps) {
  const [lookupBillId, setLookupBillId] = useState('1')
  const [billsAccountId, setBillsAccountId] = useState('1')
  const [createBillAccountId, setCreateBillAccountId] = useState('1')
  const [createBillAmount, setCreateBillAmount] = useState('50.00')
  const [createBillOverdraft, setCreateBillOverdraft] = useState(false)
  const [bulkBillsAccountId, setBulkBillsAccountId] = useState('1')
  const [bulkBills, setBulkBills] = useState<BillDraft[]>([
    { amount: '20.00', overdraftEnabled: false },
    { amount: '35.00', overdraftEnabled: true },
  ])
  const [updateBillId, setUpdateBillId] = useState('1')
  const [updateBillAccountId, setUpdateBillAccountId] = useState('1')
  const [updateBillAmount, setUpdateBillAmount] = useState('85.00')
  const [updateBillOverdraft, setUpdateBillOverdraft] = useState(true)
  const [depositBillId, setDepositBillId] = useState('1')
  const [depositBillAmount, setDepositBillAmount] = useState('25.00')
  const [depositBillEmail, setDepositBillEmail] = useState('')
  const [deleteBillId, setDeleteBillId] = useState('1')
  const [deleteBillsAccountId, setDeleteBillsAccountId] = useState('1')

  const addBulkBill = () => {
    setBulkBills((previous) => [
      ...previous,
      { amount: '10.00', overdraftEnabled: false },
    ])
  }

  const removeBulkBill = (index: number) => {
    setBulkBills((previous) => previous.filter((_, item) => item !== index))
  }

  const updateBulkBillAmount = (index: number, amount: string) => {
    setBulkBills((previous) =>
      previous.map((bill, item) => (item === index ? { ...bill, amount } : bill)),
    )
  }

  const toggleBulkBillOverdraft = (index: number, overdraftEnabled: boolean) => {
    setBulkBills((previous) =>
      previous.map((bill, item) =>
        item === index ? { ...bill, overdraftEnabled } : bill,
      ),
    )
  }

  const handleGetBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счет получен', () =>
      billsApi.getBill(parsePositiveId(lookupBillId, 'Bill ID')),
    )
  }

  const handleGetBillsByAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счета аккаунта получены', () =>
      billsApi.getBillsByAccount(parsePositiveId(billsAccountId, 'Account ID')),
    )
  }

  const handleCreateBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счет создан', async () => {
      const billId = await billsApi.createBill({
        accountId: parsePositiveId(createBillAccountId, 'Account ID'),
        amount: parseAmount(createBillAmount, 'Сумма'),
        overdraftEnabled: createBillOverdraft,
      })

      setLookupBillId(String(billId))
      setUpdateBillId(String(billId))
      setDeleteBillId(String(billId))

      return {
        billId,
        message: 'Счет успешно создан.',
      }
    })
  }

  const handleCreateBillsForAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Группа счетов создана', async () => {
      if (bulkBills.length === 0) {
        throw new Error('Добавьте хотя бы один счет в пакет.')
      }

      const accountId = parsePositiveId(bulkBillsAccountId, 'Account ID')
      const billIds = await billsApi.createBillsForAccount(
        accountId,
        bulkBills.map((bill, index) => ({
          amount: parseAmount(bill.amount, `Пакетный счет ${index + 1}`),
          overdraftEnabled: bill.overdraftEnabled,
        })),
      )

      return {
        accountId,
        billIds,
      }
    })
  }

  const handleUpdateBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счет обновлен', () =>
      billsApi.updateBill(parsePositiveId(updateBillId, 'Bill ID'), {
        accountId: parsePositiveId(updateBillAccountId, 'Account ID'),
        amount: parseAmount(updateBillAmount, 'Сумма'),
        overdraftEnabled: updateBillOverdraft,
      }),
    )
  }

  const handleDepositBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Пополнение счета выполнено', () =>
      billsApi.depositBill({
        billId: parsePositiveId(depositBillId, 'Bill ID'),
        amount: parseAmount(depositBillAmount, 'Сумма пополнения'),
        email: depositBillEmail.trim(),
      }),
    )
  }

  const handleDeleteBill = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счет удален', async () => {
      const billId = parsePositiveId(deleteBillId, 'Bill ID')
      await billsApi.deleteBill(billId)
      return {
        billId,
        message: 'Счет удален.',
      }
    })
  }

  const handleDeleteBillsByAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Счета аккаунта удалены', async () => {
      const accountId = parsePositiveId(deleteBillsAccountId, 'Account ID')
      await billsApi.deleteBillsByAccount(accountId)
      return {
        accountId,
        message: 'Все счета аккаунта удалены.',
      }
    })
  }

  return (
    <div className="forms-grid">
      <ActionCard
        title="Получить счет по ID"
        description="Получение конкретного bill."
        submitLabel="Получить счет"
        isBusy={isBusy}
        onSubmit={handleGetBill}
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={lookupBillId}
            onChange={(event) => setLookupBillId(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Счета аккаунта"
        description="Список всех bills по account ID."
        submitLabel="Получить список"
        isBusy={isBusy}
        onSubmit={handleGetBillsByAccount}
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={billsAccountId}
            onChange={(event) => setBillsAccountId(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Создать счет"
        description="Создание одного счета для аккаунта."
        submitLabel="Создать счет"
        isBusy={isBusy}
        onSubmit={handleCreateBill}
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={createBillAccountId}
            onChange={(event) => setCreateBillAccountId(event.target.value)}
          />
        </label>
        <label>
          Сумма
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={createBillAmount}
            onChange={(event) => setCreateBillAmount(event.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={createBillOverdraft}
            onChange={(event) => setCreateBillOverdraft(event.target.checked)}
          />
          Overdraft Enabled
        </label>
      </ActionCard>

      <ActionCard
        title="Создать пакет счетов"
        description="POST /bills/accounts/{accountId}."
        submitLabel="Создать пакет"
        isBusy={isBusy}
        onSubmit={handleCreateBillsForAccount}
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={bulkBillsAccountId}
            onChange={(event) => setBulkBillsAccountId(event.target.value)}
          />
        </label>
        <div className="draft-list">
          <div className="draft-list-head">
            <strong>Счета в пакете</strong>
            <button type="button" className="ghost-button" onClick={addBulkBill}>
              + Добавить
            </button>
          </div>

          {bulkBills.map((bill, index) => (
            <div key={`bulk-bill-${index}`} className="draft-row">
              <label>
                Сумма
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={bill.amount}
                  onChange={(event) =>
                    updateBulkBillAmount(index, event.target.value)
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={bill.overdraftEnabled}
                  onChange={(event) =>
                    toggleBulkBillOverdraft(index, event.target.checked)
                  }
                />
                Overdraft
              </label>
              <button
                type="button"
                className="ghost-button danger-text"
                onClick={() => removeBulkBill(index)}
                disabled={bulkBills.length === 1}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </ActionCard>

      <ActionCard
        title="Обновить счет"
        description="Обновляет accountId, amount и overdraft."
        submitLabel="Обновить счет"
        isBusy={isBusy}
        onSubmit={handleUpdateBill}
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={updateBillId}
            onChange={(event) => setUpdateBillId(event.target.value)}
          />
        </label>
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={updateBillAccountId}
            onChange={(event) => setUpdateBillAccountId(event.target.value)}
          />
        </label>
        <label>
          Сумма
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={updateBillAmount}
            onChange={(event) => setUpdateBillAmount(event.target.value)}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={updateBillOverdraft}
            onChange={(event) => setUpdateBillOverdraft(event.target.checked)}
          />
          Overdraft Enabled
        </label>
      </ActionCard>

      <ActionCard
        title="Пополнить счет (bill-service)"
        description="POST /bills/deposits."
        submitLabel="Пополнить счет"
        isBusy={isBusy}
        onSubmit={handleDepositBill}
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={depositBillId}
            onChange={(event) => setDepositBillId(event.target.value)}
          />
        </label>
        <label>
          Сумма пополнения
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={depositBillAmount}
            onChange={(event) => setDepositBillAmount(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={depositBillEmail}
            onChange={(event) => setDepositBillEmail(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Удалить счет"
        description="Удаляет bill по ID."
        submitLabel="Удалить счет"
        isBusy={isBusy}
        onSubmit={handleDeleteBill}
        tone="danger"
      >
        <label>
          Bill ID
          <input
            type="number"
            min="1"
            required
            value={deleteBillId}
            onChange={(event) => setDeleteBillId(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Удалить счета аккаунта"
        description="DELETE /bills/accounts/{accountId}."
        submitLabel="Удалить все счета"
        isBusy={isBusy}
        onSubmit={handleDeleteBillsByAccount}
        tone="danger"
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={deleteBillsAccountId}
            onChange={(event) => setDeleteBillsAccountId(event.target.value)}
          />
        </label>
      </ActionCard>
    </div>
  )
}
