import type { DecimalValue } from '../types/money'

/**
 * A tiny in-browser database used by MSW. It mirrors the Java contracts
 * closely enough to exercise every screen without running the backend, and it
 * persists to localStorage so a page refresh keeps demo operations.
 */

export interface MockAccount {
  accountId: number
  ownerSubject: string
  name: string
  email: string
  phone: string
  creationDate: string
}

export interface MockBill {
  billId: number
  accountId: number
  amount: string
  isDefault: boolean
  creationDate: string
  overdraftEnabled: boolean
}

export interface MockDeposit {
  depositId: number
  billId: number
  amount: string
  email: string
  creationDate: string
}

export interface MockDatabase {
  accounts: MockAccount[]
  bills: MockBill[]
  deposits: MockDeposit[]
  sequence: {
    account: number
    bill: number
    deposit: number
  }
}

export const DEMO_SUBJECT = 'demo-banking-user'
export const DEMO_ACCOUNT_ID = 1842

const STORAGE_KEY = 'lumen.mock-db.v1'
const MIN_DEPOSIT_CENTS = 260

const nowIso = (): string => new Date().toISOString()

function isoDaysAgo(days: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 12, 0, 0)
  return date.toISOString()
}

function seedDatabase(): MockDatabase {
  return {
    accounts: [
      {
        accountId: DEMO_ACCOUNT_ID,
        ownerSubject: DEMO_SUBJECT,
        name: 'Кира Воронцова',
        email: 'kira@lumen.bank',
        phone: '+375291234567',
        creationDate: '2021-04-18T10:00:00+03:00',
      },
    ],
    bills: [
      {
        billId: 5001,
        accountId: DEMO_ACCOUNT_ID,
        amount: '482350.00',
        isDefault: true,
        creationDate: '2021-04-18T10:04:00+03:00',
        overdraftEnabled: true,
      },
      {
        billId: 5002,
        accountId: DEMO_ACCOUNT_ID,
        amount: '128900.00',
        isDefault: false,
        creationDate: '2022-01-12T09:20:00+03:00',
        overdraftEnabled: false,
      },
      {
        billId: 5003,
        accountId: DEMO_ACCOUNT_ID,
        amount: '42780.50',
        isDefault: false,
        creationDate: '2023-06-03T14:11:00+03:00',
        overdraftEnabled: false,
      },
      {
        billId: 5004,
        accountId: DEMO_ACCOUNT_ID,
        amount: '12000.00',
        isDefault: false,
        creationDate: '2024-02-19T17:45:00+03:00',
        overdraftEnabled: false,
      },
    ],
    deposits: [
      {
        depositId: 9001,
        billId: 5001,
        amount: '50000.00',
        email: 'kira@lumen.bank',
        creationDate: isoDaysAgo(3, 12),
      },
      {
        depositId: 9002,
        billId: 5002,
        amount: '20000.00',
        email: 'kira@lumen.bank',
        creationDate: isoDaysAgo(10, 10),
      },
    ],
    sequence: {
      account: 2000,
      bill: 6000,
      deposit: 9100,
    },
  }
}

let cache: MockDatabase | null = null

function parseCents(value: DecimalValue): number {
  const normalized = String(value).trim().replace(',', '.')
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) throw new Error('Некорректная сумма')

  const whole = Number(match[2])
  const fraction = Number((match[3] ?? '').padEnd(2, '0'))
  const cents = whole * 100 + fraction
  return match[1] === '-' ? -cents : cents
}

export function toCents(value: DecimalValue): number {
  return parseCents(value)
}

export function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`
}

function isValidDatabase(value: unknown): value is MockDatabase {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>

  return (
    Array.isArray(record.accounts) &&
    Array.isArray(record.bills) &&
    Array.isArray(record.deposits) &&
    typeof record.sequence === 'object' &&
    record.sequence !== null
  )
}

export function readDatabase(): MockDatabase {
  if (cache) return cache

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isValidDatabase(parsed)) {
        cache = parsed
        return cache
      }
    }
  } catch {
    // Fall through to a clean seed.
  }

  cache = seedDatabase()
  writeDatabase(cache)
  return cache
}

export function writeDatabase(db: MockDatabase): void {
  cache = db
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // The demo still works in memory if storage is unavailable.
  }
}

export function resetDatabase(): void {
  cache = seedDatabase()
  writeDatabase(cache)
}

export function getAccount(accountId: number): MockAccount | undefined {
  return readDatabase().accounts.find((account) => account.accountId === accountId)
}

export function getAccountBySubject(subject: string): MockAccount | undefined {
  return readDatabase().accounts.find((account) => account.ownerSubject === subject)
}

export function getBills(accountId: number): MockBill[] {
  return readDatabase()
    .bills.filter((bill) => bill.accountId === accountId)
    .sort((first, second) => Number(second.isDefault) - Number(first.isDefault))
}

export function getBill(billId: number): MockBill | undefined {
  return readDatabase().bills.find((bill) => bill.billId === billId)
}

export function getDeposit(depositId: number): MockDeposit | undefined {
  return readDatabase().deposits.find((deposit) => deposit.depositId === depositId)
}

export interface CreateAccountInput {
  name: string
  email: string
  phone: string
  billCount: number
}

export function createAccount(input: CreateAccountInput): number {
  const db = readDatabase()
  const accountId = db.sequence.account
  db.sequence.account += 1

  const account: MockAccount = {
    accountId,
    ownerSubject: DEMO_SUBJECT,
    name: input.name,
    email: input.email,
    phone: input.phone,
    creationDate: nowIso(),
  }

  db.accounts.push(account)

  const count = Math.min(Math.max(input.billCount, 1), 20)
  for (let index = 0; index < count; index += 1) {
    db.bills.push({
      billId: db.sequence.bill,
      accountId,
      amount: '0.00',
      isDefault: index === 0,
      creationDate: nowIso(),
      overdraftEnabled: false,
    })
    db.sequence.bill += 1
  }

  writeDatabase(db)
  return accountId
}

export function updateAccount(
  accountId: number,
  input: { name: string; email: string; phone: string },
): MockAccount | undefined {
  const db = readDatabase()
  const account = db.accounts.find((item) => item.accountId === accountId)
  if (!account) return undefined

  account.name = input.name
  account.email = input.email
  account.phone = input.phone
  writeDatabase(db)

  return account
}

export function createBills(accountId: number, count: number): number[] {
  const db = readDatabase()
  const account = db.accounts.find((item) => item.accountId === accountId)
  if (!account) throw new Error('ACCOUNT_NOT_FOUND')

  const existing = db.bills.some((bill) => bill.accountId === accountId)
  const created: number[] = []

  for (let index = 0; index < count; index += 1) {
    const billId = db.sequence.bill
    db.sequence.bill += 1

    db.bills.push({
      billId,
      accountId,
      amount: '0.00',
      isDefault: !existing && index === 0,
      creationDate: nowIso(),
      overdraftEnabled: false,
    })
    created.push(billId)
  }

  writeDatabase(db)
  return created
}

export function depositToBill(
  billId: number,
  amount: DecimalValue,
): {
  bill: MockBill
  deposit: MockDeposit
} {
  const cents = parseCents(amount)
  if (cents < MIN_DEPOSIT_CENTS) {
    throw new Error('DEPOSIT_TOO_SMALL')
  }

  const db = readDatabase()
  const bill = db.bills.find((item) => item.billId === billId)
  if (!bill) throw new Error('BILL_NOT_FOUND')

  const account = db.accounts.find((item) => item.accountId === bill.accountId)
  if (!account) throw new Error('ACCOUNT_NOT_FOUND')

  bill.amount = centsToDecimal(parseCents(bill.amount) + cents)

  const deposit: MockDeposit = {
    depositId: db.sequence.deposit,
    billId,
    amount: centsToDecimal(cents),
    email: account.email,
    creationDate: nowIso(),
  }
  db.sequence.deposit += 1
  db.deposits.push(deposit)
  writeDatabase(db)

  return { bill, deposit }
}

export function accountToDto(account: MockAccount) {
  return {
    ownerSubject: account.ownerSubject,
    name: account.name,
    email: account.email,
    phone: account.phone,
    creationDate: account.creationDate,
  }
}

export function billToDto(bill: MockBill) {
  return {
    billId: bill.billId,
    accountId: bill.accountId,
    amount: bill.amount,
    isDefault: bill.isDefault,
    creationDate: bill.creationDate,
    overdraftEnabled: bill.overdraftEnabled,
  }
}

export function depositToDto(deposit: MockDeposit) {
  return {
    billId: deposit.billId,
    amount: deposit.amount,
    email: deposit.email,
    creationDate: deposit.creationDate,
    depositId: deposit.depositId,
  }
}
