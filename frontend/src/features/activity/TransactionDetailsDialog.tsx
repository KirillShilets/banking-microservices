import type { ReactNode } from 'react'
import type { Activity } from './types'
import { CATEGORY_META } from './analytics'
import { ActivityIcon, ActivityStatusBadge } from './activity-ui'
import { formatDate, formatTime } from '../../lib/date'
import { CopyButton } from '../../components/ui/copy-button'
import { Modal } from '../../components/ui/modal'
import { Money } from '../../components/ui/money'
import { Button } from '../../components/ui/button'

interface TransactionDetailsDialogProps {
  activity: Activity | null
  onClose: () => void
}

export function TransactionDetailsDialog({
  activity,
  onClose,
}: TransactionDetailsDialogProps) {
  return (
    <Modal
      open={Boolean(activity)}
      onClose={onClose}
      title="Детали операции"
      description={activity ? formatDate(activity.createdAt) : undefined}
      size="sm"
      footer={
        <Button variant="secondary" className="w-full" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {activity ? (
        <>
          <div className="flex flex-col items-center rounded-2xl bg-surface-soft px-5 py-6 text-center">
            <ActivityIcon category={activity.category} size="lg" />
            <p className="mt-3 text-[15px] font-bold text-ink">{activity.title}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">{activity.counterparty}</p>
            <Money
              amount={activity.amount}
              signed
              className="mt-3 text-[31px] font-extrabold tracking-[-0.045em]"
            />
            <div className="mt-3">
              <ActivityStatusBadge status={activity.status} />
            </div>
          </div>

          <div className="mt-5 space-y-0.5">
            <Row label="Категория" value={CATEGORY_META[activity.category].label} />
            <Row
              label="Дата и время"
              value={`${formatDate(activity.createdAt)}, ${formatTime(activity.createdAt)}`}
            />
            <Row label="Счёт" value={`№ ${activity.billId}`} />
            <Row
              label="Идентификатор"
              value={
                <span className="flex items-center gap-1">
                  <span className="max-w-[150px] truncate font-mono text-[11.5px]">
                    {activity.id}
                  </span>
                  <CopyButton value={activity.id} label="Скопировать ID операции" />
                </span>
              }
            />
            <Row label="Тип" value={activity.kind} />
          </div>

          <p className="mt-4 rounded-xl bg-surface-soft p-3 text-[12px] leading-relaxed text-muted">
            История операций хранится локально в демо-режиме. В production
            источником истины остаётся банковский сервис.
          </p>
        </>
      ) : null}
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2.5 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink">{value}</span>
    </div>
  )
}
