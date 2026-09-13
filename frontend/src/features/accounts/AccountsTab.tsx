import { type FormEvent, useState } from 'react'
import { accountsApi } from '../../api/modules'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import { parsePositiveId } from '../../shared/form-utils'

export function AccountsTab({
                              isBusy,
                              executeAction,
                            }: TabProps) {
  const [lookupId, setLookupId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [billCount, setBillCount] = useState('1')

  const [updateId, setUpdateId] = useState('')
  const [updateName, setUpdateName] = useState('')
  const [updateEmail, setUpdateEmail] = useState('')
  const [updatePhone, setUpdatePhone] = useState('')

  const getCurrent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction(
        'Мой профиль',
        () => accountsApi.getCurrentAccount(),
    )
  }

  const getAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Профиль получен', () =>
        accountsApi.getAccount(
            parsePositiveId(lookupId, 'ID клиента'),
        ),
    )
  }

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Профиль создан', async () => {
      const count = parsePositiveId(billCount, 'Количество счетов')

      if (count > 20) {
        throw new Error('Допустимо не более 20 начальных счетов.')
      }

      const id = await accountsApi.createAccount({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bills: Array.from({ length: count }, () => ({
          amount: 0,
          overdraftEnabled: false,
        })),
      })

      setLookupId(String(id))
      setUpdateId(String(id))

      return {
        accountId: id,
        message:
            'Профиль создан. Открытие счетов выполняется асинхронно.',
      }
    })
  }

  const updateAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    void executeAction('Профиль обновлён', () =>
        accountsApi.updateAccount(
            parsePositiveId(updateId, 'ID клиента'),
            {
              name: updateName.trim(),
              email: updateEmail.trim(),
              phone: updatePhone.trim(),
            },
        ),
    )
  }

  return (
      <div className="forms-grid" aria-busy={isBusy}>
        <ActionCard
            title="Мой профиль"
            description="Профиль текущего пользователя."
            submitLabel="Получить мой профиль"
            isBusy={isBusy}
            onSubmit={getCurrent}
        >
          <p>Идентификатор владельца определяется по вашей сессии.</p>
        </ActionCard>

        <ActionCard
            title="Получить профиль"
            description="Доступ к чужим профилям проверяется сервером."
            submitLabel="Получить"
            isBusy={isBusy}
            onSubmit={getAccount}
        >
          <fieldset disabled={isBusy}>
            <label>
              ID клиента
              <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  required
                  value={lookupId}
                  onChange={(event) => setLookupId(event.target.value)}
              />
            </label>
          </fieldset>
        </ActionCard>

        <ActionCard
            title="Создать мой профиль"
            description="Один профиль на пользователя. Начальные счета открываются без денег и овердрафта."
            submitLabel="Создать"
            isBusy={isBusy}
            onSubmit={createAccount}
        >
          <fieldset disabled={isBusy}>
            <label>
              Имя
              <input
                  required
                  minLength={3}
                  maxLength={63}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label>
              Email
              <input
                  type="email"
                  required
                  maxLength={127}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Телефон
              <input
                  type="tel"
                  required
                  pattern="\+?[0-9]{10,15}"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
              />
            </label>

            <label>
              Количество счетов
              <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  required
                  value={billCount}
                  onChange={(event) => setBillCount(event.target.value)}
              />
            </label>
          </fieldset>
        </ActionCard>

        <ActionCard
            title="Изменить контактные данные"
            description="Изменяются только имя, email и телефон."
            submitLabel="Сохранить"
            isBusy={isBusy}
            onSubmit={updateAccount}
        >
          <fieldset disabled={isBusy}>
            <label>
              ID клиента
              <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]+"
                  required
                  value={updateId}
                  onChange={(event) => setUpdateId(event.target.value)}
              />
            </label>

            <label>
              Имя
              <input
                  required
                  minLength={3}
                  maxLength={63}
                  value={updateName}
                  onChange={(event) => setUpdateName(event.target.value)}
              />
            </label>

            <label>
              Email
              <input
                  type="email"
                  required
                  maxLength={127}
                  value={updateEmail}
                  onChange={(event) => setUpdateEmail(event.target.value)}
              />
            </label>

            <label>
              Телефон
              <input
                  type="tel"
                  required
                  pattern="\+?[0-9]{10,15}"
                  value={updatePhone}
                  onChange={(event) => setUpdatePhone(event.target.value)}
              />
            </label>
          </fieldset>
        </ActionCard>
      </div>
  )
}