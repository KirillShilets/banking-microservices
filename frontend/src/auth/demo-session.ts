import { primaryRole, type AuthUser, type BankRole } from './types'

const DEMO_ROLE_KEY = 'lumen.demo.role'
const DEMO_SUBJECT = 'demo-banking-user'

const DEMO_PROFILES: Record<
  BankRole,
  { username: string; displayName: string; email: string; roles: BankRole[] }
> = {
  // The demo keeps one identity across roles so the profile, account and
  // sandbox data stay coherent while permissions change.
  customer: {
    username: 'customer.kira',
    displayName: 'Кира Воронцова',
    email: 'kira@lumen.bank',
    roles: ['customer'],
  },
  employee: {
    username: 'employee.kira',
    displayName: 'Кира Воронцова',
    email: 'kira@lumen.bank',
    roles: ['employee', 'customer'],
  },
  admin: {
    username: 'admin.kira',
    displayName: 'Кира Воронцова',
    email: 'kira@lumen.bank',
    roles: ['admin', 'employee', 'customer'],
  },
}

function isDemoRole(value: string | null): value is BankRole {
  return value === 'customer' || value === 'employee' || value === 'admin'
}

export function getDemoRole(): BankRole {
  if (typeof window === 'undefined') return 'customer'
  const stored = window.localStorage.getItem(DEMO_ROLE_KEY)
  return isDemoRole(stored) ? stored : 'customer'
}

export function setDemoRole(role: BankRole): void {
  window.localStorage.setItem(DEMO_ROLE_KEY, role)
}

export function createDemoUser(role: BankRole = getDemoRole()): AuthUser {
  const profile = DEMO_PROFILES[role]

  return {
    subject: DEMO_SUBJECT,
    username: profile.username,
    displayName: profile.displayName,
    email: profile.email,
    roles: profile.roles,
    primaryRole: primaryRole(profile.roles),
    isDemo: true,
  }
}

export function demoAccessToken(): string {
  return `demo-access-token:${getDemoRole()}`
}

export const DEMO_ACCOUNT_ID = 1842
