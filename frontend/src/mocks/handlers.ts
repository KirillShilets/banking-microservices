import { delay, http, HttpResponse } from 'msw'
import { appConfig } from '../config'
import type { BankRole } from '../auth/types'
import {
  accountToDto,
  billToDto,
  createAccount,
  createBills,
  DEMO_SUBJECT,
  depositToBill,
  depositToDto,
  getAccount,
  getAccountBySubject,
  getBill,
  getBills,
  getDeposit,
  readDatabase,
  toCents,
  updateAccount,
} from './db'

const LATENCY_MS = 260

/** Resolve mock routes against the gateway configured at runtime. */
const api = (path: string) => new URL(path, appConfig.gatewayUrl).toString()

function errorResponse(status: number, message: string) {
  return HttpResponse.json(
    {
      message,
      status,
      timestamp: new Date().toISOString().slice(0, 19),
    },
    { status },
  )
}

function roleFromRequest(request: Request): BankRole | null {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer demo-access-token:(customer|employee|admin)$/.exec(header)
  return (match?.[1] as BankRole | undefined) ?? null
}

function isStaff(role: BankRole | null): boolean {
  return role === 'employee' || role === 'admin'
}

function numericParam(value: string | readonly string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^\d+$/.test(raw)) return null

  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

interface AccountBody {
  name?: unknown
  email?: unknown
  phone?: unknown
  bills?: unknown
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export const handlers = [
  http.get(api('/accounts/me'), async () => {
    await delay(LATENCY_MS)

    const account = getAccountBySubject(DEMO_SUBJECT)
    if (!account) return errorResponse(404, 'Account not found')

    return HttpResponse.json(accountToDto(account))
  }),

  http.get(api('/accounts/:accountId'), async ({ params }) => {
    await delay(LATENCY_MS)

    const accountId = numericParam(params.accountId)
    if (accountId === null) return errorResponse(400, 'Invalid account id')

    const account = getAccount(accountId)
    if (!account) return errorResponse(404, 'Account not found')

    return HttpResponse.json(accountToDto(account))
  }),

  http.post(api('/accounts'), async ({ request }) => {
    await delay(420)

    const body = (await request.json()) as AccountBody
    const name = readText(body.name)
    const email = readText(body.email)
    const phone = readText(body.phone)
    const bills = Array.isArray(body.bills) ? body.bills : []

    if (name.length < 3 || !email.includes('@') || phone.length < 10) {
      return errorResponse(400, 'name: invalid profile data')
    }

    if (bills.length < 1 || bills.length > 20) {
      return errorResponse(400, 'bills: at least one bill must be provided')
    }

    if (getAccountBySubject(DEMO_SUBJECT)) {
      return errorResponse(409, 'Account already exists')
    }

    const accountId = createAccount({
      name,
      email,
      phone,
      billCount: bills.length,
    })

    return HttpResponse.json(accountId, { status: 201 })
  }),

  http.put(api('/accounts/:accountId'), async ({ params, request }) => {
    await delay(360)

    const accountId = numericParam(params.accountId)
    if (accountId === null) return errorResponse(400, 'Invalid account id')

    const body = (await request.json()) as AccountBody
    const name = readText(body.name)
    const email = readText(body.email)
    const phone = readText(body.phone)

    if (name.length < 3 || !email.includes('@') || phone.length < 10) {
      return errorResponse(400, 'name: invalid profile data')
    }

    const account = updateAccount(accountId, { name, email, phone })
    if (!account) return errorResponse(404, 'Account not found')

    return HttpResponse.json({
      accountId: account.accountId,
      name: account.name,
      email: account.email,
      phone: account.phone,
    })
  }),

  http.get(api('/bills/accounts/:accountId'), async ({ params }) => {
    await delay(300)

    const accountId = numericParam(params.accountId)
    if (accountId === null) return errorResponse(400, 'Invalid account id')
    if (!getAccount(accountId)) return errorResponse(404, 'Account not found')

    return HttpResponse.json(getBills(accountId).map(billToDto))
  }),

  http.get(api('/bills/:billId'), async ({ params }) => {
    await delay(LATENCY_MS)

    const billId = numericParam(params.billId)
    if (billId === null) return errorResponse(400, 'Invalid bill id')

    const bill = getBill(billId)
    if (!bill) return errorResponse(404, 'Bill not found')

    return HttpResponse.json(billToDto(bill))
  }),

  http.post(api('/bills/accounts/:accountId'), async ({ params, request }) => {
    await delay(420)

    const accountId = numericParam(params.accountId)
    if (accountId === null) return errorResponse(400, 'Invalid account id')
    if (!getAccount(accountId)) return errorResponse(404, 'Account not found')

    const body: unknown = await request.json()
    if (!Array.isArray(body) || body.length < 1 || body.length > 20) {
      return errorResponse(400, 'At least one bill must be provided')
    }

    const invalid = body.some((item) => {
      if (typeof item !== 'object' || item === null) return true
      const bill = item as Record<string, unknown>
      return toCents(String(bill.amount ?? '')) !== 0 || bill.overdraftEnabled !== false
    })

    if (invalid) {
      return errorResponse(400, 'A new bill must have a zero balance')
    }

    const ids = createBills(accountId, body.length)
    return HttpResponse.json(ids, { status: 201 })
  }),

  http.post(api('/bills/sandbox/deposits'), async ({ request }) => {
    await delay(420)

    const role = roleFromRequest(request)
    if (!isStaff(role)) {
      return errorResponse(403, 'Access is denied')
    }

    const body = (await request.json()) as {
      billId?: unknown
      amount?: unknown
    }

    const billId = typeof body.billId === 'number' ? body.billId : null
    const amount = body.amount === undefined ? '' : String(body.amount)

    if (billId === null || !Number.isSafeInteger(billId)) {
      return errorResponse(400, 'Bill id is required')
    }

    let result: ReturnType<typeof depositToBill>
    try {
      result = depositToBill(billId, amount)
    } catch (error) {
      if (error instanceof Error && error.message === 'DEPOSIT_TOO_SMALL') {
        return errorResponse(400, 'Amount must be at least 2.60')
      }
      return errorResponse(404, 'Bill not found')
    }

    const account = getAccount(result.bill.accountId)

    return HttpResponse.json({
      billId: result.bill.billId,
      accountId: result.bill.accountId,
      amount: result.deposit.amount,
      email: account?.email ?? '',
      isDefault: result.bill.isDefault,
      overdraftEnabled: result.bill.overdraftEnabled,
      creationDate: result.deposit.creationDate,
    })
  }),

  http.post(api('/bills'), async ({ request }) => {
    await delay(380)

    const body = (await request.json()) as {
      accountId?: unknown
      amount?: unknown
      overdraftEnabled?: unknown
    }

    const accountId = typeof body.accountId === 'number' ? body.accountId : null
    if (accountId === null || !getAccount(accountId)) {
      return errorResponse(404, 'Account not found')
    }

    if (toCents(String(body.amount ?? '')) !== 0 || body.overdraftEnabled !== false) {
      return errorResponse(400, 'A new bill must have a zero balance')
    }

    const [billId] = createBills(accountId, 1)
    return HttpResponse.json(billId, { status: 201 })
  }),

  http.get(api('/deposits/:depositId'), async ({ params, request }) => {
    await delay(LATENCY_MS)

    if (!isStaff(roleFromRequest(request))) {
      return errorResponse(403, 'Access is denied')
    }

    const depositId = numericParam(params.depositId)
    if (depositId === null) return errorResponse(400, 'Invalid deposit id')

    const deposit = getDeposit(depositId)
    if (!deposit) return errorResponse(404, 'Deposit not found')

    const dto = depositToDto(deposit)
    return HttpResponse.json({
      billId: dto.billId,
      amount: dto.amount,
      email: dto.email,
      creationDate: dto.creationDate,
    })
  }),

  http.get(api('/_demo/state'), async () => {
    await delay(100)
    const db = readDatabase()
    return HttpResponse.json({
      accounts: db.accounts.length,
      bills: db.bills.length,
      deposits: db.deposits.length,
    })
  }),
]
