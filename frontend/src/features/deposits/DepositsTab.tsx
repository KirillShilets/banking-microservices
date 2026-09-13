import { type FormEvent, useState } from 'react'
import { depositsApi } from '../../api/modules'
import { ActionCard } from '../common/ActionCard'
import type { TabProps } from '../common/types'
import { parsePositiveId } from '../../shared/form-utils'

export function DepositsTab({ isBusy, executeAction }: TabProps) {
  const [lookupDepositId, setLookupDepositId] = useState('1')

  const handleGetDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeAction('Депозит получен', () =>
      depositsApi.getDeposit(parsePositiveId(lookupDepositId, 'Deposit ID')),
    )
  }

  return (
    <div className="forms-grid">
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

    </div>
  )
}
