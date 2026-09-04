import { useMemo, useState } from 'react'
import { API_BASE_URL } from './api/core'
import { AccountsTab } from './features/accounts/AccountsTab'
import { BillsTab } from './features/bills/BillsTab'
import { DepositsTab } from './features/deposits/DepositsTab'
import { displayName, hasRealmRole, logout } from './auth/session'
import type { ActionResult, ExecuteAction } from './features/app/types'
import './App.css'

type TabId = 'accounts' | 'bills' | 'deposits'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'accounts', label: 'Аккаунты' },
  { id: 'bills', label: 'Счета' },
  { id: 'deposits', label: 'Депозиты и уведомления' },
]

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('accounts')
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<ActionResult | null>(null)

  const isAdmin = hasRealmRole('admin')

  const prettyResult = useMemo(() => {
    if (!result) {
      return ''
    }

    return JSON.stringify(result.payload, null, 2)
  }, [result])

  const resultTimestamp = useMemo(() => {
    if (!result) {
      return ''
    }

    return new Date(result.timestamp).toLocaleString('ru-RU')
  }, [result])

  const executeAction: ExecuteAction = async (title, action) => {
    setIsBusy(true)
    setErrorMessage('')

    try {
      const payload = await action()
      setResult({
        title,
        payload,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Не удалось выполнить операцию.')
      }
    } finally {
      setIsBusy(false)
    }
  }

  return (
      <div className="app-shell">
        <header className="app-header">
          <p className="eyebrow">Spring Cloud Banking System</p>
          <h1>Frontend Control Panel</h1>
          <p>
            Пользователь: <strong>{displayName()}</strong>
            <button type="button" className="ghost-button" onClick={() => void logout()}>
              Выйти
            </button>
          </p>
          <p>
            Интерфейс работает через API Gateway:
            <code>{API_BASE_URL}</code>
          </p>
        </header>

        <div className="tab-list">
          {tabs.map((tab) => (
              <button
                  key={tab.id}
                  type="button"
                  className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
          ))}
        </div>

        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        <main className="workspace">
          <section className="workspace-forms">
            {activeTab === 'accounts' ? (
                <AccountsTab isBusy={isBusy} executeAction={executeAction} isAdmin={isAdmin} />
            ) : null}

            {activeTab === 'bills' ? (
                <BillsTab isBusy={isBusy} executeAction={executeAction} isAdmin={isAdmin} />
            ) : null}

            {activeTab === 'deposits' ? (
                <DepositsTab isBusy={isBusy} executeAction={executeAction} isAdmin={isAdmin} />
            ) : null}
          </section>

          <aside className="workspace-result">
            <h2>Результат последнего запроса</h2>
            {!result ? (
                <p className="muted">
                  Здесь появится ответ API после выполнения любой операции.
                </p>
            ) : (
                <>
                  <p className="result-meta">
                    <strong>{result.title}</strong>
                    <span>{resultTimestamp}</span>
                  </p>
                  <pre>{prettyResult}</pre>
                </>
            )}
          </aside>
        </main>
      </div>
  )
}

export default App