import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Logo } from '../components/ui/logo'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

/**
 * Last line of defence: keeps a render error from producing a blank screen and
 * gives the customer a single, safe recovery action.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 shadow-float">
          <Logo asLink={false} className="mb-8" />

          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-soft text-rose">
            <TriangleAlert className="h-5 w-5" />
          </span>

          <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.035em] text-ink">
            Приложение столкнулось с ошибкой
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Мы сохранили вашу сессию. Перезагрузите страницу — данные и
            незавершённые операции не пострадают.
          </p>

          {import.meta.env.DEV ? (
            <pre className="mt-5 overflow-auto rounded-xl bg-surface-soft p-3 text-[12px] leading-relaxed text-muted">
              {this.state.error.message}
            </pre>
          ) : null}

          <Button
            className="mt-6 w-full"
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => window.location.reload()}
          >
            Перезагрузить приложение
          </Button>
        </div>
      </main>
    )
  }
}
