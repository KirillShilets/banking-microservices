import { RotateCw, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Logo } from '../components/ui/logo'
import { Skeleton } from '../components/ui/skeleton'

export function BootstrapScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <Logo asLink={false} className="mb-8 justify-center" />

        <div className="rounded-[28px] border border-line bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-soft text-[#4f6b0d]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Защищённый вход</p>
              <p className="text-[13px] text-muted">Проверяем сессию Keycloak…</p>
            </div>
          </div>

          <div className="mt-6 space-y-3" aria-hidden="true">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-4/5 rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] font-medium uppercase tracking-[0.18em] text-faint">
          Lumen Bank · Private banking
        </p>
      </div>
    </main>
  )
}

export function AuthenticationErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-7 shadow-float">
        <Logo asLink={false} className="mb-8" />

        <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          Не удалось выполнить вход
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Сервис авторизации Keycloak недоступен или вход не был завершён.
          Проверьте подключение и попробуйте снова.
        </p>

        <Button
          className="mt-6 w-full"
          leadingIcon={<RotateCw className="h-4 w-4" />}
          onClick={onRetry}
        >
          Повторить вход
        </Button>
      </div>
    </main>
  )
}
