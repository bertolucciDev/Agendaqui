import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/app/providers/session'

/**
 * FE-MVP-01 — guarda de primeiro acesso administrativo.
 * Regra: e-mail verificado (garantido por ProtectedRoute) + catálogo da sessão SEM
 * nenhum business administrativo/profissional (owned ou membership) → /onboarding/business.
 * Critério é o catálogo de businesses — NÃO availableModes (CUSTOMER-only também entra no fluxo).
 * Funcionário convidado (com membership/business) nunca é redirecionado. Nunca businesses[0].
 */
export function FirstBusinessGuard({ children }: { children: ReactNode }) {
  const { session, isSessionLoading } = useSession()
  const location = useLocation()

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!session) return <>{children}</>

  const hasAdministrativeBusiness = session.businesses.length > 0
  const onOnboardingRoute = location.pathname.startsWith('/onboarding')

  if (!hasAdministrativeBusiness && !onOnboardingRoute) {
    return <Navigate to="/onboarding/business" replace />
  }

  return <>{children}</>
}
