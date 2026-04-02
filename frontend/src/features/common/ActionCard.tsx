import type { FormEvent, ReactNode } from 'react'

interface ActionCardProps {
  title: string
  description: string
  submitLabel: string
  isBusy: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  tone?: 'default' | 'danger'
}

export function ActionCard({
  title,
  description,
  submitLabel,
  isBusy,
  onSubmit,
  children,
  tone = 'default',
}: ActionCardProps) {
  return (
    <form
      className={`action-card ${tone === 'danger' ? 'action-card-danger' : ''}`}
      onSubmit={onSubmit}
    >
      <div className="action-card-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="action-card-body">{children}</div>
      <button
        type="submit"
        className={`action-button ${tone === 'danger' ? 'action-button-danger' : ''}`}
        disabled={isBusy}
      >
        {isBusy ? 'Выполняется...' : submitLabel}
      </button>
    </form>
  )
}
