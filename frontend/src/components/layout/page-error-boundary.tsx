import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface PageErrorBoundaryProps {
  children: ReactNode
}

interface PageErrorBoundaryState {
  error: Error | null
}

/**
 * Keeps a route-level render failure inside the shell, so navigation and the
 * session stay usable instead of taking down the whole application.
 */
export class PageErrorBoundary extends Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  state: PageErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Page render failed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <Card className="p-7 sm:p-9">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-soft text-rose">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-[23px] font-extrabold tracking-[-0.03em] text-ink">
            Не удалось показать раздел
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Остальные разделы доступны. Попробуйте открыть страницу снова или
            перезагрузите приложение.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => this.setState({ error: null })}
            >
              Попробовать снова
            </Button>
            <Button onClick={() => window.location.reload()}>
              Перезагрузить
            </Button>
          </div>
        </div>
      </Card>
    )
  }
}
