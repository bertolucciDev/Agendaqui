import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { AuthProvider } from './auth'
import { SessionProvider } from './session'
import { WorkspaceProvider } from './workspace'
import { ThemeProvider } from './theme'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { AppToaster } from '@/components/feedback/toaster'
import type { ReactNode } from 'react'
import { useAuth } from './auth'
import { SupportWidget } from '@/components/support/support-widget'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return (
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SessionProvider>
                <WorkspaceProvider>
                  <BrowserRouter>
                    {children}
                    <SupportLauncher />
                    <AppToaster />
                  </BrowserRouter>
                </WorkspaceProvider>
              </SessionProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
  )
}

function SupportLauncher() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated || location.pathname.startsWith('/help') || location.pathname.startsWith('/support')) return null

  return <SupportWidget />
}
