import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Prevents closing by backdrop/Escape while a mutation is in flight. */
  dismissible?: boolean
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined

    previousFocus.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 60)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus.current?.focus?.()
    }
  }, [dismissible, onClose, open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Закрыть окно"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-navy/45 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissible ? onClose : undefined}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 34, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-white/80 bg-white shadow-float outline-none sm:rounded-[28px]',
              sizeClasses[size],
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[28px] border-b border-line/70 bg-white/92 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div className="min-w-0">
                {title ? (
                  <h2
                    id={titleId}
                    className="text-[20px] font-bold tracking-[-0.025em] text-ink"
                  >
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-0.5 text-[14px] leading-relaxed text-muted"
                  >
                    {description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={!dismissible}
                aria-label="Закрыть"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-black/[0.05] hover:text-ink disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6">{children}</div>

            {footer ? (
              <div className="sticky bottom-0 border-t border-line/70 bg-white/92 px-5 py-4 backdrop-blur-xl sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
