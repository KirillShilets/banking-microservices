import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../auth'
import { rememberAccountId } from '../auth/account-link'
import { AppProviders } from './providers'

vi.mock('../api/modules', () => {
  const account = {
    ownerSubject: 'demo-banking-user',
    name: 'Кира Воронцова',
    email: 'kira@lumen.bank',
    phone: '+375291234567',
    creationDate: '2021-04-18T10:00:00+03:00',
  }

  const bills = [
    {
      billId: 5001,
      accountId: 1842,
      amount: '482350.00',
      isDefault: true,
      creationDate: '2021-04-18T10:04:00+03:00',
      overdraftEnabled: true,
    },
    {
      billId: 5002,
      accountId: 1842,
      amount: '128900.00',
      isDefault: false,
      creationDate: '2022-01-12T09:20:00+03:00',
      overdraftEnabled: false,
    },
  ]

  return {
    accountsApi: {
      getCurrentAccount: vi.fn(async () => account),
      getAccount: vi.fn(async () => account),
      createAccount: vi.fn(async () => 1843),
      updateAccount: vi.fn(async () => ({
        accountId: 1842,
        name: account.name,
        email: account.email,
        phone: account.phone,
      })),
    },
    billsApi: {
      getBill: vi.fn(async () => bills[0]),
      getBillsByAccount: vi.fn(async () => bills),
      createBill: vi.fn(async () => 6001),
      createBillsForAccount: vi.fn(async () => [6001]),
      depositBill: vi.fn(async () => ({
        billId: 5001,
        accountId: 1842,
        amount: '1000.00',
        email: account.email,
        isDefault: true,
        overdraftEnabled: true,
        creationDate: '2025-01-01T10:00:00+03:00',
      })),
    },
    depositsApi: {
      getDeposit: vi.fn(async () => ({
        billId: 5001,
        amount: '50000.00',
        email: account.email,
        creationDate: '2025-01-01T10:00:00+03:00',
      })),
    },
  }
})

const user: AuthUser = {
  subject: 'demo-banking-user',
  username: 'customer.kira',
  displayName: 'Кира Воронцова',
  email: 'kira@lumen.bank',
  roles: ['customer'],
  primaryRole: 'customer',
  isDemo: false,
}

function renderApplication(path = '/') {
  window.history.pushState({}, '', path)
  return render(<AppProviders bootstrap={{ user, mode: 'demo' }} />)
}

describe('application smoke test', () => {
  beforeEach(() => {
    window.localStorage.clear()
    rememberAccountId(user.subject, 1842)
  })

  it('renders the dashboard with account data', async () => {
    renderApplication()

    expect(await screen.findByText('Всего на счетах', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Мои карты и счета' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('482 350 ₽')).length).toBeGreaterThan(0)
    expect(screen.getByText('Последние операции')).toBeInTheDocument()
  })

  it('navigates between the primary sections', async () => {
    const browserUser = userEvent.setup()
    renderApplication()

    await screen.findByText('Всего на счетах', undefined, { timeout: 5000 })

    await browserUser.click(screen.getAllByRole('link', { name: 'История' })[0])
    expect(
      await screen.findByRole('heading', { name: 'История операций' }, { timeout: 5000 }),
    ).toBeInTheDocument()

    await browserUser.click(screen.getAllByRole('link', { name: 'Платежи' })[0])
    expect(
      await screen.findByRole('heading', { name: 'Платежи и счета' }, { timeout: 5000 }),
    ).toBeInTheDocument()

    await browserUser.click(screen.getAllByRole('link', { name: 'Профиль' })[0])
    expect(
      await screen.findByRole('heading', { name: 'Профиль и настройки' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('renders cashback categories and the estimate', async () => {
    renderApplication('/cashback')

    expect(
      await screen.findByRole('heading', { name: 'Кэшбэк' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect((await screen.findAllByText('Супермаркеты')).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { pressed: true }).length,
    ).toBeGreaterThan(0)
  })
})
