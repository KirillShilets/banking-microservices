import { LogIn, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth'
import { Button } from '../components/ui/button'
import { Logo } from '../components/ui/logo'

/**
 * Rendered only when the demo session has been explicitly ended. In Keycloak
 * mode the user is redirected by Keycloak before this screen can appear.
 */
export function SignedOutScreen() {
  const { login, mode } = useAuth()

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-line bg-white shadow-float">
        <div className="relative overflow-hidden bg-navy px-7 pb-7 pt-8 text-white">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-lime/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-mint/10 blur-3xl" />

          <Logo tone="light" asLink={false} className="relative" />

          <h1 className="relative mt-8 text-[29px] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Сессия завершена
          </h1>
          <p className="relative mt-2 max-w-xs text-[14px] leading-relaxed text-white/55">
            Войдите снова, чтобы продолжить работу со счетами. Мы не храним
            платёжные данные в браузере.
          </p>
        </div>

        <div className="p-7">
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-soft p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint-soft text-emerald">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">
                Защита через {mode === 'demo' ? 'демо-сессию' : 'защищённый вход'}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                {mode === 'demo'
                  ? 'Демо-режим создаёт локальную сессию без реальных данных.'
                  : 'Токен доступа хранится в памяти вкладки и обновляется автоматически.'}
              </p>
            </div>
          </div>

          <Button
            className="mt-5 w-full"
            size="lg"
            leadingIcon={<LogIn className="h-4 w-4" />}
            onClick={() => void login()}
          >
            Войти в Lumen
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-faint">
            <UserRound className="h-3.5 w-3.5" />
            customer · employee · admin
          </p>
        </div>
      </div>
    </main>
  )
}
