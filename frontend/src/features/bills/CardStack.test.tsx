import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BillResponseDTO } from '../../dto/response'
import { CardStack } from './CardStack'

const bills: BillResponseDTO[] = [
  {
    billId: 5001,
    accountId: 1842,
    amount: '100.00',
    isDefault: true,
    creationDate: '2026-10-01T10:00:00Z',
    overdraftEnabled: false,
  },
  {
    billId: 5002,
    accountId: 1842,
    amount: '0.00',
    isDefault: false,
    creationDate: '2026-10-02T10:00:00Z',
    overdraftEnabled: false,
  },
]

describe('CardStack keyboard access', () => {
  it('steps to the next card when the active card is activated', async () => {
    const onAdvance = vi.fn()
    render(<CardStack bills={bills} activeBillId={5001} onAdvance={onAdvance} />)

    await userEvent.click(screen.getByRole('button', { name: /5001 — текущая карта/ }))

    expect(onAdvance).toHaveBeenCalledWith(1)
  })

  it('moves between cards with the arrow keys while a card has focus', async () => {
    const onAdvance = vi.fn()
    const onSelect = vi.fn()
    render(
      <CardStack
        bills={bills}
        activeBillId={5001}
        onAdvance={onAdvance}
        onSelect={onSelect}
      />,
    )

    const covered = screen.getByRole('button', { name: /5002 — выбрать/ })
    covered.focus()
    expect(covered).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(onAdvance).toHaveBeenCalledWith(1)

    await userEvent.keyboard('{ArrowLeft}')
    expect(onAdvance).toHaveBeenCalledWith(-1)
  })

  it('selects a covered card with Enter and Space', async () => {
    const onSelect = vi.fn()
    render(<CardStack bills={bills} activeBillId={5001} onSelect={onSelect} />)

    const covered = screen.getByRole('button', { name: /5002 — выбрать/ })
    covered.focus()

    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ billId: 5002 }))

    await userEvent.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('marks the active card for assistive technology', () => {
    render(<CardStack bills={bills} activeBillId={5002} />)

    expect(screen.getByRole('button', { name: /5002 — текущая карта/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /5001 — выбрать/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
