const ACCOUNT_ID_PREFIX = 'lumen.account-id.'

export function rememberAccountId(subject: string, accountId: number): void {
  if (!subject || !Number.isSafeInteger(accountId) || accountId <= 0) return
  window.localStorage.setItem(`${ACCOUNT_ID_PREFIX}${subject}`, String(accountId))
}

export function getRememberedAccountId(subject: string): number | null {
  if (!subject) return null

  const raw = window.localStorage.getItem(`${ACCOUNT_ID_PREFIX}${subject}`)
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function forgetAccountId(subject: string): void {
  window.localStorage.removeItem(`${ACCOUNT_ID_PREFIX}${subject}`)
}
