import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBillsSummary } from '../bills/use-bills'
import {
  formatMoney,
  minorToDecimal,
  sumMoney,
  toMinorUnits,
} from '../../lib/money'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Modal } from '../../components/ui/modal'
import { Money } from '../../components/ui/money'
import { useToast } from '../../components/ui/toast'

const GOAL_KEY = 'lumen.savings-goal.v1'
const DEFAULT_GOAL = '500000.00'

function readGoal(): string {
  try {
    const raw = window.localStorage.getItem(GOAL_KEY)
    if (!raw) return DEFAULT_GOAL
    return /^\d+\.\d{2}$/.test(raw) ? raw : DEFAULT_GOAL
  } catch {
    return DEFAULT_GOAL
  }
}

export function SavingsGoalCard() {
  const { savingsBills } = useBillsSummary()
  const toast = useToast()
  const [goal, setGoal] = useState(readGoal)
  const [draft, setDraft] = useState(goal)
  const [open, setOpen] = useState(false)

  const openGoal = () => {
    setDraft(goal)
    setOpen(true)
  }

  const saved = sumMoney(savingsBills.map((bill) => bill.amount))
  const target = toMinorUnits(goal)
  const progress = target === 0n ? 0 : Math.min(Number(saved) / Number(target), 1)
  const remaining = target > saved ? target - saved : 0n

  const saveGoal = () => {
    const normalized = draft.trim().replace(/\s/g, '').replace(',', '.')

    if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
      toast.error('Некорректная сумма', 'Укажите сумму с точностью до копеек')
      return
    }

    const [whole, fraction = ''] = normalized.split('.')
    const canonical = `${whole}.${fraction.padEnd(2, '0')}`

    if (Number(whole) <= 0) {
      toast.error('Цель должна быть больше нуля')
      return
    }

    try {
      window.localStorage.setItem(GOAL_KEY, canonical)
    } catch {
      // The state below still works for this session.
    }

    setGoal(canonical)
    setOpen(false)
    toast.success('Цель обновлена')
  }

  return (
    <>
      <Card className="relative overflow-hidden p-5">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-lime/20 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-bold tracking-[-0.015em] text-ink">
              Цель накоплений
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted">По дополнительным счетам</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
            <Target className="h-4 w-4" />
          </span>
        </div>

        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div>
            <Money
              amount={minorToDecimal(saved)}
              hideZeroFraction
              className="text-[25px] font-extrabold tracking-[-0.045em] text-ink"
            />
            <p className="mt-0.5 text-[12px] text-muted">
              из {formatMoney(goal, { hideZeroFraction: true })}
            </p>
          </div>
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[12px] font-bold text-ink">
            {Math.round(progress * 100)}%
          </span>
        </div>

        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-line/70">
          <motion.div
            className="h-full rounded-full bg-ink"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress * 100, 2)}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="relative mt-3 flex items-center justify-between">
          <span className="text-[12px] text-muted">
            {remaining > 0n ? (
              <>
                Осталось <Money amount={minorToDecimal(remaining)} hideZeroFraction />
              </>
            ) : (
              <span className="font-semibold text-emerald">Цель достигнута</span>
            )}
          </span>

          <button
            type="button"
            onClick={openGoal}
            className="text-[12px] font-bold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
          >
            Изменить
          </button>
        </div>

        {savingsBills.length === 0 ? (
          <Link
            to="/accounts"
            className="relative mt-4 flex items-center justify-between rounded-xl bg-surface-soft px-3 py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-lime-soft"
          >
            Открыть накопительный счёт
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Цель накоплений"
        description="Цель хранится локально и не отправляется в банк."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button onClick={saveGoal}>Сохранить</Button>
          </div>
        }
      >
        <Input
          label="Сумма цели, ₽"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          inputMode="decimal"
          autoFocus
          hint="Например, 500000 или 750000.00"
        />
      </Modal>
    </>
  )
}
