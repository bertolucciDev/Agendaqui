import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './auth'
import { sessionApi } from '@/services/api/session'
import type { MeSession } from '@/types/session'
import { extractApiStatus } from '@/lib/api-error'

/**
 * SessionProvider — camada de descoberta pós-login (CONTRACT FREEZE: GET /me/session).
 * Expor: user (AuthProvider), availableModes, businesses, customerProfile, isPlatformAdmin, preferences.
 * Não contém seleção de contexto (isso é WorkspaceProvider). Não é autorização.
 */
interface SessionContextType {
  session: MeSession | null
  isSessionLoading: boolean
  sessionError: Error | null
  retrySession: () => void
  refreshSession: () => void
}

const SessionContext = createContext<SessionContextType | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: sessionApi.getSession,
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 60_000,
    retry: (failureCount, queryError) =>
      extractApiStatus(queryError) !== 429 && failureCount < 1,
  })

  return (
    <SessionContext.Provider
      value={{
        session: isAuthenticated ? (data ?? null) : null,
        isSessionLoading: isAuthenticated ? isLoading : false,
        sessionError: (error as Error | null) ?? null,
        retrySession: () => {
          void refetch()
        },
        refreshSession: () => {
          void queryClient.invalidateQueries({ queryKey: ['session'] })
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
