import { useState, type FormEvent, type ReactNode } from 'react'
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  Globe,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ROLE_LABELS,
  isStaff,
  useAuth,
  useAuthUser,
  type BankRole,
} from '../../auth'
import { useAccount } from '../../features/account/AccountProvider'
import { useUpdateAccount } from '../../features/account/mutations'
import { CreateAccountDialog } from '../../features/account/CreateAccountDialog'
import { LinkAccountDialog } from '../../features/account/LinkAccountDialog'
import { useBills, summariseBills } from '../../features/bills/use-bills'
import { setPreference, usePreferences } from '../../features/preferences/preferences-store'
import { appConfig } from '../../config'
import { formatDate } from '../../lib/date'
import { minorToDecimal } from '../../lib/money'
import { validateEmail } from '../../lib/validation'
import { toMessage } from '../../lib/errors'
import { cn } from '../../lib/cn'
import { Avatar } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { CopyButton } from '../../components/ui/copy-button'
import { EmptyState } from '../../components/ui/states'
import { Input } from '../../components/ui/input'
import { Money } from '../../components/ui/money'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'
import { Switch } from '../../components/ui/switch'
import { useToast } from '../../components/ui/toast'

const ROLE_DESCRIPTIONS: Record<BankRole, string> = {
  customer: 'Клиентский кабинет, счета и история.',
  employee: 'Клиентский кабинет и тестовых пополнений.',
  admin: 'Полный доступ, включая депозиты.',
}

export function ProfilePage() {
  const user = useAuthUser()
  const { logout, mode } = useAuth()
  const { hideBalances, notifications } = usePreferences()
  const toast = useToast()

  const {
    account,
    accountId,
    isLoading,
    isAccountMissing,
    needsAccountLink,
    error,
    refetch,
  } = useAccount()

  const billsQuery = useBills()
  const summary = summariseBills(billsQuery.data ?? [])

  const [createOpen, setCreateOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const staff = isStaff(user)
  const roleLabel = user.primaryRole ? ROLE_LABELS[user.primaryRole] : 'Гость'

  if (isLoading) {
    return <ProfileSkeleton />
  }

  const handleLogout = async () => {
    setLogoutBusy(true)
    try {
      await logout()
      toast.info('Сессия завершена')
    } catch {
      toast.error('Не удалось завершить сессию')
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Профиль"
        title="Профиль и настройки"
        description="Личные данные, безопасность и параметры интерфейса."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<LogOut className="h-4 w-4" />}
            loading={logoutBusy}
            onClick={() => void handleLogout()}
          >
            Выйти
          </Button>
        }
      />

      <Card className="relative overflow-hidden border-white/10 bg-navy text-white">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-lime/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-mint/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size="xl" ring />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[23px] font-extrabold tracking-[-0.04em] text-white sm:text-[27px]">
                  {user.displayName}
                </h2>
                <Badge variant="lime">{roleLabel}</Badge>
                {user.isDemo ? <Badge variant="dark">demo</Badge> : null}
              </div>

              <p className="mt-1 truncate text-[13.5px] text-white/45">
                @{user.username} · {user.email || 'email не указан'}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-white/35">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {account ? `Клиент с ${formatDate(account.creationDate)}` : 'Профиль не создан'}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span className="font-mono">{user.subject.slice(0, 18)}…</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                Счета
              </p>
              <p className="mt-1 text-[21px] font-extrabold tracking-[-0.04em]">
                {billsQuery.isPending ? '—' : (billsQuery.data?.length ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                Баланс
              </p>
              {billsQuery.isPending ? (
                <span className="mt-1 block text-[18px] font-extrabold text-white/40">
                  —
                </span>
              ) : (
                <Money
                  amount={minorToDecimal(summary.total)}
                  tone="inherit"
                  hideZeroFraction
                  className="mt-1 block text-[18px] font-extrabold tracking-[-0.04em]"
                />
              )}
            </div>
          </div>
        </div>
      </Card>

      {error && !isAccountMissing ? (
        <Card className="mt-4 p-4">
          <p className="text-[13px] text-rose">{toMessage(error)}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Повторить
          </Button>
        </Card>
      ) : null}

      {isAccountMissing ? (
        <Card className="mt-4">
          <EmptyState
            icon={Plus}
            title="Профиль ещё не создан"
            description="Создайте профиль, чтобы указать контактные данные и открыть счета."
            action={
              <Button onClick={() => setCreateOpen(true)} leadingIcon={<Plus className="h-4 w-4" />}>
                Создать профиль
              </Button>
            }
          />
        </Card>
      ) : needsAccountLink ? (
        <Card className="mt-4">
          <EmptyState
            icon={Link2}
            title="Счёт не привязан"
            description="Привяжите номер счёта, чтобы обновлять данные и работать с балансом."
            action={
              <Button onClick={() => setLinkOpen(true)} leadingIcon={<Link2 className="h-4 w-4" />}>
                Привязать счёт
              </Button>
            }
          />
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-4">
          <PersonalDataCard
            key={account?.ownerSubject ?? 'no-account'}
            account={account}
            accountId={accountId}
            disabled={!account || !accountId || needsAccountLink}
            onSaved={() => void refetch()}
          />

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
                  Настройки интерфейса
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Применяются сразу и сохраняются на устройстве
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-faint" />
            </div>

            <div className="mt-5 space-y-4">
              <Switch
                checked={hideBalances}
                onChange={(checked) => setPreference('hideBalances', checked)}
                label="Скрывать балансы"
                description="Маскирует все суммы в интерфейсе. Полезно для демонстрации экрана."
              />
              <div className="h-px bg-line/70" />
              <Switch
                checked={notifications}
                onChange={(checked) => setPreference('notifications', checked)}
                label="Уведомления об операциях"
                description="Локальный переключатель. Push-уведомления в демо-режиме не отправляются."
              />
            </div>
          </Card>

          {user.isDemo ? <DemoRolesCard /> : null}

          <Card className="p-5">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
              Техническая информация
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Параметры текущего окружения
            </p>

            <div className="mt-4 space-y-0.5">
              <InfoRow label="Режим входа" value={mode === 'demo' ? 'Демо-режим' : 'защищённый вход'} />
              <InfoRow
                label="Gateway"
                value={<span className="font-mono text-[11.5px]">{appConfig.gatewayUrl}</span>}
              />
              <InfoRow
                label="Keycloak realm"
                value={<span className="font-mono text-[11.5px]">{appConfig.keycloakRealm}</span>}
              />
              <InfoRow
                label="Mock API"
                value={
                  <Badge variant={appConfig.mockApi ? 'lime' : 'neutral'}>
                    {appConfig.mockApi ? 'MSW on' : 'off'}
                  </Badge>
                }
              />
              <InfoRow label="Сборка" value="React 19 · Vite · TanStack Query" />
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint-soft text-emerald">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-ink">Безопасность</h2>
                <p className="text-[11.5px] text-muted">Сессия активна</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {ROLE_LABELS[role]}
                  </Badge>
                ))}
              </div>

              <div className="rounded-xl bg-surface-soft p-3">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                  <KeyRound className="h-3.5 w-3.5 text-muted" />
                  Bearer JWT
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  Токен добавляется Axios-интерсептором. При 401 выполняется один
                  refresh, затем — повторный вход.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              leadingIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => void handleLogout()}
              loading={logoutBusy}
            >
              Завершить сессию
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-soft text-[#4f6b0d]">
                <Globe className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-ink">Поддержка</h2>
                <p className="text-[11.5px] text-muted">Private banking 24/7</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Вопросы по счетам, лимитам и безопасности — напишите нам.
            </p>
            <a
              href="mailto:support@lumen.bank"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink underline decoration-line-strong underline-offset-4"
            >
              support@lumen.bank
            </a>
          </Card>

          {staff ? (
            <Card className="p-5">
              <h2 className="text-[14px] font-bold text-ink">Инструменты сотрудника</h2>
              <div className="mt-3 space-y-2">
                <Link
                  to="/payments?tab=deposit"
                  className="flex items-center justify-between rounded-xl bg-surface-soft px-3 py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-lime-soft"
                >
                  Проверка депозита
                  <BadgeCheck className="h-4 w-4 text-muted" />
                </Link>
                <Link
                  to="/accounts"
                  className="flex items-center justify-between rounded-xl bg-surface-soft px-3 py-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-lime-soft"
                >
                  Все счета профиля
                  <BadgeCheck className="h-4 w-4 text-muted" />
                </Link>
              </div>
            </Card>
          ) : null}

          <p className="px-1 text-center text-[11.5px] text-faint">
            Lumen Bank · frontend v1.0.0
          </p>
        </aside>
      </div>

      <CreateAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <LinkAccountDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  )
}

function PersonalDataCard({
  account,
  accountId,
  disabled,
  onSaved,
}: {
  account: {
    name: string
    email: string
    phone: string
    ownerSubject: string
    creationDate: string
  } | null
  accountId: number | null
  disabled: boolean
  onSaved: () => void
}) {
  const toast = useToast()
  const updateAccount = useUpdateAccount(accountId)

  const [email, setEmail] = useState(account?.email ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // The bank owns the legal name and phone number. The UI keeps them
  // read-only, and the payload always uses the server values so they cannot be
  // changed even by tampering with the form state.
  const name = account?.name ?? ''
  const phone = account?.phone ?? ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!account) return

    const nextErrors: Record<string, string> = {}
    const emailCheck = validateEmail(email)

    if (!emailCheck.valid && emailCheck.message) nextErrors.email = emailCheck.message

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await updateAccount.mutateAsync({
        name: account.name,
        email: email.trim(),
        phone: account.phone,
      })
      toast.success('Данные обновлены')
      onSaved()
    } catch (error) {
      toast.error('Не удалось обновить профиль', toMessage(error))
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
            Личные данные
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Email можно изменить. Имя, фамилия и телефон доступны только для
            чтения.
          </p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-soft text-muted">
          <UserRound className="h-4 w-4" />
        </span>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Имя и фамилия"
            value={name}
            readOnly
            disabled={disabled}
            hint="Изменяется только сотрудником банка"
            leadingIcon={<UserRound className="h-4 w-4" />}
            trailing={<LockKeyhole className="h-4 w-4 text-faint" />}
            autoComplete="name"
          />
          <Input
            label="Телефон"
            value={phone}
            readOnly
            disabled={disabled}
            hint="Изменяется только сотрудником банка"
            leadingIcon={<Phone className="h-4 w-4" />}
            trailing={<LockKeyhole className="h-4 w-4 text-faint" />}
            autoComplete="tel"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          disabled={disabled}
          leadingIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />

        <div className="flex flex-col gap-3 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11.5px] text-faint">
            {account ? (
              <span className="inline-flex items-center gap-1.5">
                <Copy className="h-3 w-3" />
                ownerSubject:{' '}
                <span className="font-mono">{account.ownerSubject.slice(0, 12)}…</span>
                <CopyButton
                  value={account.ownerSubject}
                  label="Скопировать ownerSubject"
                />
              </span>
            ) : (
              'Профиль не создан'
            )}
          </div>

          <Button
            type="submit"
            size="sm"
            loading={updateAccount.isPending}
            disabled={disabled}
            leadingIcon={<Check className="h-4 w-4" />}
          >
            Сохранить
          </Button>
        </div>

        {disabled ? (
          <p className="rounded-xl bg-amber-soft p-3 text-[12.5px] text-amber">
            Чтобы редактировать данные, создайте или привяжите профиль.
          </p>
        ) : null}
      </form>
    </Card>
  )
}

function DemoRolesCard() {
  const { switchDemoRole } = useAuth()
  const user = useAuthUser()
  const toast = useToast()

  const roles: BankRole[] = ['customer', 'employee', 'admin']

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">
              Демо-роли
            </h2>
            <Badge variant="lime">только demo</Badge>
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Переключите роль, чтобы проверить адаптацию интерфейса и тестовые операции.
          </p>
        </div>
        <ShieldCheck className="h-4 w-4 text-faint" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {roles.map((role) => {
          const active = user.primaryRole === role

          return (
            <button
              key={role}
              type="button"
              onClick={() => {
                switchDemoRole(role)
                toast.info('Роль переключена', `${ROLE_LABELS[role]} · демо-сессия`)
              }}
              aria-pressed={active}
              className={cn(
                'rounded-2xl border p-3.5 text-left transition-colors duration-200',
                active
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white hover:border-line-strong hover:bg-surface-soft',
              )}
            >
              <span
                className={cn(
                  'text-[10.5px] font-bold uppercase tracking-[0.14em]',
                  active ? 'text-white/45' : 'text-faint',
                )}
              >
                {role}
              </span>
              <span
                className={cn(
                  'mt-1 block text-[13.5px] font-bold',
                  active ? 'text-white' : 'text-ink',
                )}
              >
                {ROLE_LABELS[role]}
              </span>
              <span
                className={cn(
                  'mt-1 block text-[11.5px] leading-relaxed',
                  active ? 'text-white/50' : 'text-muted',
                )}
              >
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-ink">{value}</span>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка профиля">
      <div className="space-y-3 pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[190px] w-full rounded-3xl" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-[300px] rounded-3xl" />
          <Skeleton className="h-[200px] rounded-3xl" />
        </div>
        <Skeleton className="h-[280px] rounded-3xl" />
      </div>
    </div>
  )
}
