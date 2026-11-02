import { ArrowRight, Check, CircleDashed } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'

interface StartChecklistProps {
  hasTopUp: boolean
  hasTransfer: boolean
  hasCashback: boolean
  onTopUp: () => void
  onTransfer: () => void
  onCashback: () => void
}

/**
 * First-run checklist. "Пополнить" and "Перевести" are derived from the local
 * activity feed; the cashback step is remembered on the device because the
 * selection lives in its own store.
 */
export function StartChecklist({
  hasTopUp,
  hasTransfer,
  hasCashback,
  onTopUp,
  onTransfer,
  onCashback,
}: StartChecklistProps) {
  const [cashbackDone, setCashbackDone] = useState(hasCashback)

  const steps = [
    {
      id: 'topup',
      title: 'Пополните счёт',
      hint: 'Тестовое пополнение, чтобы появились операции',
      done: hasTopUp,
      action: onTopUp,
      actionLabel: 'Пополнить',
    },
    {
      id: 'transfer',
      title: 'Сделайте первый перевод',
      hint: 'Между своими счетами или в пользу другого клиента',
      done: hasTransfer,
      action: onTransfer,
      actionLabel: 'Перевести',
    },
    {
      id: 'cashback',
      title: 'Выберите категории кэшбэка',
      hint: 'До трёх категорий и лимит 3 000 ₽ в месяц',
      done: cashbackDone,
      action: () => {
        setCashbackDone(true)
        onCashback()
      },
      actionLabel: 'Выбрать',
    },
  ]

  const doneCount = steps.filter((step) => step.done).length

  return (
    <section
      aria-labelledby="start-checklist-heading"
      className="rounded-3xl border border-line bg-white p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="start-checklist-heading"
            className="text-[16px] font-extrabold tracking-[-0.02em] text-ink"
          >
            Начните за 3 шага
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Пока нет операций — вот что стоит сделать первым
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[13px] font-bold text-ink">
          {doneCount}/3
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
              step.done ? 'border-emerald/25 bg-emerald-soft' : 'border-line bg-surface-soft',
            )}
          >
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold',
                step.done ? 'bg-emerald text-white' : 'bg-white text-muted',
              )}
              aria-hidden="true"
            >
              {step.done ? <Check className="h-4 w-4" /> : index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink">{step.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                {step.hint}
              </span>
            </span>

            {step.done ? (
              <CircleDashed className="h-4 w-4 shrink-0 text-emerald" aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={step.action}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                {step.actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
