import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './auth'
import { SessionProvider } from './session'
import { WorkspaceProvider } from './workspace'
import { ThemeProvider } from './theme'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import type { ReactNode } from 'react'

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
                    <Toaster position="top-right" />
                  </BrowserRouter>
                </WorkspaceProvider>
              </SessionProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
  )
}
