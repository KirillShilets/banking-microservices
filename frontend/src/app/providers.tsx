import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../App'
import { AuthProvider, useAuth } from '../auth'
import type { AuthBootstrapResult } from '../auth/bootstrap'
import { SignedOutScreen } from '../auth/SignedOutScreen'
import { ToastProvider } from '../components/ui/toast'
import { AccountProvider } from '../features/account/AccountProvider'
import { AppErrorBoundary } from './error-boundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

function AuthenticatedApplication() {
  const { user } = useAuth()

  if (!user) {
    return <SignedOutScreen />
  }

  return (
    <AccountProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AccountProvider>
  )
}

export function AppProviders({
  bootstrap,
}: {
  bootstrap: AuthBootstrapResult
}) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider bootstrap={bootstrap}>
          <ToastProvider>
            <AuthenticatedApplication />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
