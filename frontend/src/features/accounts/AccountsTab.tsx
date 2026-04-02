import { type FormEvent, useState } from 'react'
import { accountsApi } from '../../api/modules'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import type { BillDraft } from '../../shared/form-utils'
import { parseAmount, parsePositiveId } from '../../shared/form-utils'

export function AccountsTab({ isBusy, executeAction }: TabProps) {
  const [lookupAccountId, setLookupAccountId] = useState('1')
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountPhone, setAccountPhone] = useState('+375291234567')
  const [initialBills, setInitialBills] = useState<BillDraft[]>([
    { amount: '100.00', overdraftEnabled: false },
  ])
  const [updateAccountId, setUpdateAccountId] = useState('1')
  const [updateName, setUpdateName] = useState('')
  const [updateEmail, setUpdateEmail] = useState('')
  const [updatePhone, setUpdatePhone] = useState('+375291234567')
  const [deleteAccountId, setDeleteAccountId] = useState('1')

  const addInitialBill = () => {
    setInitialBills((previous) => [
      ...previous,
      { amount: '10.00', overdraftEnabled: false },
    ])
  }

  const removeInitialBill = (index: number) => {
    setInitialBills((previous) => previous.filter((_, item) => item !== index))
  }

  const updateInitialBillAmount = (index: number, amount: string) => {
    setInitialBills((previous) =>
      previous.map((bill, item) => (item === index ? { ...bill, amount } : bill)),
    )
  }

  const toggleInitialBillOverdraft = (index: number, overdraftEnabled: boolean) => {
    setInitialBills((previous) =>
      previous.map((bill, item) =>
        item === index ? { ...bill, overdraftEnabled } : bill,
      ),
    )
  }

  const handleGetAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Аккаунт получен', () =>
      accountsApi.getAccount(parsePositiveId(lookupAccountId, 'Account ID')),
    )
  }

  const handleCreateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Аккаунт создан', async () => {
      if (initialBills.length === 0) {
        throw new Error('Добавьте хотя бы один стартовый счет.')
      }

      const createdAccountId = await accountsApi.createAccount({
        name: accountName.trim(),
        email: accountEmail.trim(),
        phone: accountPhone.trim(),
        bills: initialBills.map((bill, index) => ({
          amount: parseAmount(bill.amount, `Стартовый счет ${index + 1}`),
          overdraftEnabled: bill.overdraftEnabled,
        })),
      })

      setLookupAccountId(String(createdAccountId))
      setUpdateAccountId(String(createdAccountId))
      setDeleteAccountId(String(createdAccountId))

      return {
        accountId: createdAccountId,
        message: 'Аккаунт успешно создан.',
      }
    })
  }

  const handleUpdateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Аккаунт обновлен', () =>
      accountsApi.updateAccount(parsePositiveId(updateAccountId, 'Account ID'), {
        name: updateName.trim(),
        email: updateEmail.trim(),
        phone: updatePhone.trim(),
      }),
    )
  }

  const handleDeleteAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Аккаунт удален', async () => {
      const accountId = parsePositiveId(deleteAccountId, 'Account ID')
      await accountsApi.deleteAccount(accountId)
      return {
        accountId,
        message: 'Аккаунт удален.',
      }
    })
  }

  return (
    <div className="forms-grid">
      <ActionCard
        title="Получить аккаунт по ID"
        description="Запрос в account-service через gateway."
        submitLabel="Получить аккаунт"
        isBusy={isBusy}
        onSubmit={handleGetAccount}
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={lookupAccountId}
            onChange={(event) => setLookupAccountId(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Создать аккаунт"
        description="Создает клиента и один или несколько стартовых счетов."
        submitLabel="Создать аккаунт"
        isBusy={isBusy}
        onSubmit={handleCreateAccount}
      >
        <label>
          Имя
          <input
            type="text"
            minLength={3}
            maxLength={63}
            required
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={accountEmail}
            onChange={(event) => setAccountEmail(event.target.value)}
          />
        </label>
        <label>
          Телефон
          <input
            type="text"
            required
            value={accountPhone}
            onChange={(event) => setAccountPhone(event.target.value)}
          />
        </label>

        <div className="draft-list">
          <div className="draft-list-head">
            <strong>Стартовые счета</strong>
            <button type="button" className="ghost-button" onClick={addInitialBill}>
              + Добавить
            </button>
          </div>

          {initialBills.map((bill, index) => (
            <div key={`initial-bill-${index}`} className="draft-row">
              <label>
                Сумма
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={bill.amount}
                  onChange={(event) =>
                    updateInitialBillAmount(index, event.target.value)
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={bill.overdraftEnabled}
                  onChange={(event) =>
                    toggleInitialBillOverdraft(index, event.target.checked)
                  }
                />
                Overdraft
              </label>
              <button
                type="button"
                className="ghost-button danger-text"
                onClick={() => removeInitialBill(index)}
                disabled={initialBills.length === 1}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </ActionCard>

      <ActionCard
        title="Обновить аккаунт"
        description="Обновляет name, email и phone."
        submitLabel="Обновить аккаунт"
        isBusy={isBusy}
        onSubmit={handleUpdateAccount}
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={updateAccountId}
            onChange={(event) => setUpdateAccountId(event.target.value)}
          />
        </label>
        <label>
          Имя
          <input
            type="text"
            minLength={3}
            maxLength={63}
            required
            value={updateName}
            onChange={(event) => setUpdateName(event.target.value)}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={updateEmail}
            onChange={(event) => setUpdateEmail(event.target.value)}
          />
        </label>
        <label>
          Телефон
          <input
            type="text"
            required
            value={updatePhone}
            onChange={(event) => setUpdatePhone(event.target.value)}
          />
        </label>
      </ActionCard>

      <ActionCard
        title="Удалить аккаунт"
        description="Удаляет аккаунт и связанные данные."
        submitLabel="Удалить аккаунт"
        isBusy={isBusy}
        onSubmit={handleDeleteAccount}
        tone="danger"
      >
        <label>
          Account ID
          <input
            type="number"
            min="1"
            required
            value={deleteAccountId}
            onChange={(event) => setDeleteAccountId(event.target.value)}
          />
        </label>
      </ActionCard>
    </div>
  )
}
