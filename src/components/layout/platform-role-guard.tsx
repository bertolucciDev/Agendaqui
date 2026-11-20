import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/auth'
import { useSession } from '@/app/providers/session'
import { LoadingFallback } from '@/App'
import { meApi } from '@/services/api/auth'

export function PlatformRoleGuard({ area }: { area: 'admin' | 'support' }) {
  const { isLoading: isAuthLoading } = useAuth()
  const { session, isSessionLoading } = useSession()
  const profile = useQuery({
    queryKey: ['me', 'admin-profile'],
    queryFn: meApi.getAdminProfile,
    enabled: session?.isPlatformAdmin === true,
  })

  if (isAuthLoading || isSessionLoading || (session?.isPlatformAdmin && profile.isPending)) {
    return <LoadingFallback />
  }

  if (!session?.isPlatformAdmin) return <Navigate to="/dashboard" replace />

  if (profile.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p role="alert" className="text-sm text-muted-foreground">
          Não foi possível confirmar o perfil desta conta.
        </p>
        <button className="btn btn-primary" onClick={() => void profile.refetch()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  const isSupport = profile.data?.level === 'SUPPORT'
  if (area === 'support') {
    return isSupport ? <Outlet /> : <Navigate to="/admin" replace />
  }

  return isSupport ? <Navigate to="/support" replace /> : <Outlet />
}
