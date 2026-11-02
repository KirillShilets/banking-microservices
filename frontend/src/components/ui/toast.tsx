import { AnimatePresence, motion } from 'framer-motion'
import {
  CircleAlert,
  CircleCheck,
  Info,
  X,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

interface ToastInput {
  tone?: ToastTone
  title: string
  description?: string
}

interface ToastApi {
  push: (input: ToastInput) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald/20 bg-emerald-soft text-emerald',
  error: 'border-rose/20 bg-rose-soft text-rose',
  info: 'border-line bg-white text-ink',
}

const toneIcons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} satisfies Record<ToastTone, typeof CircleCheck>

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    ({ tone = 'info', title, description }: ToastInput) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current.slice(-2), { id, tone, title, description }])

      const timer = window.setTimeout(() => dismiss(id), 4800)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) => push({ tone: 'success', title, description }),
      error: (title, description) => push({ tone: 'error', title, description }),
      info: (title, description) => push({ tone: 'info', title, description }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-3 z-[130] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toneIcons[toast.tone]

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-float backdrop-blur-xl"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-xl border',
                      toneStyles[toast.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[14px] font-bold text-ink">{toast.title}</p>
                    {toast.description ? (
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                        {toast.description}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Закрыть уведомление"
                    className="grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-black/[0.05] hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}
