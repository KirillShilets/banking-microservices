import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/app-shell'
import { PageErrorBoundary } from './components/layout/page-error-boundary'
import { Skeleton } from './components/ui/skeleton'
import { NotFoundPage } from './pages/not-found/NotFoundPage'

const HomePage = lazy(() =>
  import('./pages/home/HomePage').then((module) => ({ default: module.HomePage })),
)
const PaymentsPage = lazy(() =>
  import('./pages/payments/PaymentsPage').then((module) => ({
    default: module.PaymentsPage,
  })),
)
const HistoryPage = lazy(() =>
  import('./pages/history/HistoryPage').then((module) => ({
    default: module.HistoryPage,
  })),
)
const AccountsPage = lazy(() =>
  import('./pages/accounts/AccountsPage').then((module) => ({
    default: module.AccountsPage,
  })),
)
const ProfilePage = lazy(() =>
  import('./pages/profile/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)
const CashbackPage = lazy(() =>
  import('./pages/cashback/CashbackPage').then((module) => ({
    default: module.CashbackPage,
  })),
)

function PageFallback() {
  return (
    <div aria-busy="true" aria-label="Загрузка страницы" className="space-y-4">
      <div className="space-y-3 pb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[260px] w-full rounded-[30px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[180px] rounded-3xl" />
        <Skeleton className="h-[180px] rounded-3xl" />
      </div>
    </div>
  )
}

function Page({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </PageErrorBoundary>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <Page>
              <HomePage />
            </Page>
          }
        />
        <Route
          path="payments"
          element={
            <Page>
              <PaymentsPage />
            </Page>
          }
        />
        <Route
          path="history"
          element={
            <Page>
              <HistoryPage />
            </Page>
          }
        />
        <Route
          path="accounts"
          element={
            <Page>
              <AccountsPage />
            </Page>
          }
        />
        <Route
          path="profile"
          element={
            <Page>
              <ProfilePage />
            </Page>
          }
        />
        <Route
          path="cashback"
          element={
            <Page>
              <CashbackPage />
            </Page>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
