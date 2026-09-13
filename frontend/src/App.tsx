import {
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { API_BASE_URL } from './api/core'
import { AccountsTab } from './features/accounts/AccountsTab'
import { BillsTab } from './features/bills/BillsTab'
import { DepositsTab } from './features/deposits/DepositsTab'
import {
  AuthenticationRequiredError,
  displayName,
  getSessionSnapshot,
  hasRealmRole,
  login,
  logout,
  subscribeSession,
} from './auth/session'
import type {
  ActionResult,
  ExecuteAction,
} from './features/app/types'
import './App.css'

type TabId = 'accounts' | 'bills' | 'deposits'

function App() {
  useSyncExternalStore(
      subscribeSession,
      getSessionSnapshot,
      getSessionSnapshot,
  )

  const [activeTab, setActiveTab] = useState<TabId>('accounts')
  const [isBusy, setIsBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)

  const inFlight = useRef(false)

  const isAdmin = hasRealmRole('admin')
  const isEmployee = hasRealmRole('employee')
  const isCustomer = hasRealmRole('customer')

  const canUseBanking = isAdmin || isEmployee || isCustomer
  const canReadDeposits = isAdmin || isEmployee

  const visibleTab =
      activeTab === 'deposits' && !canReadDeposits
          ? 'accounts'
          : activeTab

  const executeAction: ExecuteAction = async (title, action) => {
    if (inFlight.current) {
      return
    }

    inFlight.current = true
    setIsBusy(true)
    setErrorMessage('')
    setRequiresLogin(false)
    setResult(null)

    try {
      const payload = await action()

      setResult({
        title,
        payload,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      setRequiresLogin(error instanceof AuthenticationRequiredError)

      setErrorMessage(
          error instanceof Error
              ? error.message
              : 'Не удалось выполнить операцию.',
      )
    } finally {
      inFlight.current = false
      setIsBusy(false)
    }
  }

  const handleLogin = async () => {
    try {
      await login()
    } catch {
      setErrorMessage('Не удалось перейти к странице входа.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      setErrorMessage('Не удалось завершить сессию.')
    }
  }

  return (
      <div className="app-shell">
        <header className="app-header">
          <p className="eyebrow">Spring Cloud Banking System</p>
          <h1>Демонстрационная API-консоль</h1>

          <p>
            Пользователь: <strong>{displayName()}</strong>
          </p>

          <button
              type="button"
              className="ghost-button"
              disabled={isBusy}
              onClick={() => void handleLogout()}
          >
            Выйти
          </button>

          <p>
            API Gateway: <code>{API_BASE_URL}</code>
          </p>
        </header>

        {errorMessage ? (
            <div className="error-banner" role="alert">
              <p>{errorMessage}</p>

              {requiresLogin ? (
                  <button
                      type="button"
                      onClick={() => void handleLogin()}
                  >
                    Войти повторно
                  </button>
              ) : null}
            </div>
        ) : null}

        {!canUseBanking ? (
            <p role="alert">
              У пользователя нет роли для работы с банковским API.
            </p>
        ) : (
            <>
              <nav className="tab-list" aria-label="Разделы">
                <button
                    type="button"
                    className={`tab-button ${
                        visibleTab === 'accounts' ? 'tab-button-active' : ''
                    }`}
                    disabled={isBusy}
                    aria-current={visibleTab === 'accounts' ? 'page' : undefined}
                    onClick={() => setActiveTab('accounts')}
                >
                  Профили
                </button>

                <button
                    type="button"
                    className={`tab-button ${
                        visibleTab === 'bills' ? 'tab-button-active' : ''
                    }`}
                    disabled={isBusy}
                    aria-current={visibleTab === 'bills' ? 'page' : undefined}
                    onClick={() => setActiveTab('bills')}
                >
                  Счета
                </button>

                {canReadDeposits ? (
                    <button
                        type="button"
                        className={`tab-button ${
                            visibleTab === 'deposits' ? 'tab-button-active' : ''
                        }`}
                        disabled={isBusy}
                        aria-current={visibleTab === 'deposits' ? 'page' : undefined}
                        onClick={() => setActiveTab('deposits')}
                    >
                      История пополнений
                    </button>
                ) : null}
              </nav>

              <main className="workspace" aria-busy={isBusy}>
                <section className="workspace-forms">
                  {visibleTab === 'accounts' ? (
                      <AccountsTab
                          isBusy={isBusy}
                          executeAction={executeAction}
                          isAdmin={isAdmin}
                      />
                  ) : null}

                  {visibleTab === 'bills' ? (
                      <BillsTab
                          isBusy={isBusy}
                          executeAction={executeAction}
                          isAdmin={isAdmin}
                      />
                  ) : null}

                  {visibleTab === 'deposits' && canReadDeposits ? (
                      <DepositsTab
                          isBusy={isBusy}
                          executeAction={executeAction}
                          isAdmin={isAdmin}
                      />
                  ) : null}
                </section>

                <aside className="workspace-result">
                  <h2>Результат запроса</h2>

                  {isBusy ? <p role="status">Выполняется запрос…</p> : null}

                  {result ? (
                      <>
                        <p className="result-meta">
                          <strong>{result.title}</strong>
                          <span>
                      {new Date(result.timestamp).toLocaleString('ru-RU')}
                    </span>
                        </p>

                        <pre>
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                      </>
                  ) : (
                      <p className="muted">
                        После выполнения операции здесь появится ответ API.
                      </p>
                  )}
                </aside>
              </main>
            </>
        )}
      </div>
  )
}

export default App