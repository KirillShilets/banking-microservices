export type BankRole = 'customer' | 'employee' | 'admin'

export interface AuthUser {
  subject: string
  username: string
  displayName: string
  email: string
  roles: BankRole[]
  primaryRole: BankRole | null
  isDemo: boolean
}

export type AuthMode = 'keycloak' | 'demo'

export interface AuthContextValue {
  user: AuthUser | null
  mode: AuthMode
  sessionExpired: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  switchDemoRole: (role: BankRole) => void
}

export function isBankRole(value: string): value is BankRole {
  return value === 'customer' || value === 'employee' || value === 'admin'
}

export function primaryRole(roles: BankRole[]): BankRole | null {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('employee')) return 'employee'
  if (roles.includes('customer')) return 'customer'
  return null
}

export function isStaff(user: Pick<AuthUser, 'roles'> | null): boolean {
  return Boolean(user?.roles.includes('admin') || user?.roles.includes('employee'))
}

export function canReadDeposits(user: Pick<AuthUser, 'roles'> | null): boolean {
  return isStaff(user)
}

export const ROLE_LABELS: Record<BankRole, string> = {
  customer: 'Клиент',
  employee: 'Сотрудник',
  admin: 'Администратор',
}
