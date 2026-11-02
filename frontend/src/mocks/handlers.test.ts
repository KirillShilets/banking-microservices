import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  window.localStorage.clear()
  resetDatabase()
  server.resetHandlers()
})

const base = 'http://api.localhost'

function auth(role: 'customer' | 'employee' | 'admin' = 'employee') {
  return { Authorization: `Bearer demo-access-token:${role}` }
}

describe('MSW banking API', () => {
  it('serves the current account and its bills', async () => {
    const accountResponse = await fetch(`${base}/accounts/me`, {
      headers: auth(),
    })
    expect(accountResponse.status).toBe(200)

    const account = (await accountResponse.json()) as { name: string }
    expect(account.name).toBe('Кира Воронцова')

    const billsResponse = await fetch(`${base}/bills/accounts/1842`, {
      headers: auth(),
    })
    expect(billsResponse.status).toBe(200)

    const bills = (await billsResponse.json()) as Array<{
      billId: number
      amount: string
      isDefault: boolean
    }>

    expect(bills).toHaveLength(4)
    expect(bills[0]).toMatchObject({ billId: 5001, isDefault: true })
  })

  it('allows employees to make a sandbox deposit and updates the balance', async () => {
    const response = await fetch(`${base}/bills/sandbox/deposits`, {
      method: 'POST',
      headers: { ...auth('employee'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId: 5001, amount: '1000.00' }),
    })

    expect(response.status).toBe(200)

    const deposit = (await response.json()) as { amount: string; billId: number }
    expect(deposit).toMatchObject({ billId: 5001, amount: '1000.00' })

    const billsResponse = await fetch(`${base}/bills/accounts/1842`, {
      headers: auth(),
    })
    const bills = (await billsResponse.json()) as Array<{
      billId: number
      amount: string
    }>
    expect(bills.find((bill) => bill.billId === 5001)?.amount).toBe('483350.00')
  })

  it('forbids customers from using the sandbox endpoint', async () => {
    const response = await fetch(`${base}/bills/sandbox/deposits`, {
      method: 'POST',
      headers: { ...auth('customer'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId: 5001, amount: '1000.00' }),
    })

    expect(response.status).toBe(403)
  })

  it('serves deposit lookups only to staff', async () => {
    const forbidden = await fetch(`${base}/deposits/9001`, {
      headers: auth('customer'),
    })
    expect(forbidden.status).toBe(403)

    const response = await fetch(`${base}/deposits/9001`, {
      headers: auth('admin'),
    })
    expect(response.status).toBe(200)

    const deposit = (await response.json()) as { amount: string }
    expect(deposit.amount).toBe('50000.00')
  })
})
