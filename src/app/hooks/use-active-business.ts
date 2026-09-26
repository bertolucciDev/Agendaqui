import { useSession } from '@/app/providers/session'
import { useWorkspace } from '@/app/providers/workspace'

/**
 * Compat shim (D2): páginas existentes consomem business ativo daqui.
 * Fonte de verdade agora é WorkspaceProvider (contexto validado pelo contrato /me/session).
 * PROIBIDO: resolução por índice (businesses[0] extinto).
 */
export function useActiveBusiness() {
  const { session, isSessionLoading } = useSession()
  const workspace = useWorkspace()
  const { activeBusiness, isContextReady } = workspace

  return {
    businesses: session?.businesses ?? [],
    business: activeBusiness,
    businessId: activeBusiness?.id,
    activeMode: workspace.activeMode,
    isLoading: isSessionLoading,
    isContextReady,
  }
}
