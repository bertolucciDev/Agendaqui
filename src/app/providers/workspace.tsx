import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from './session'
import type { SessionBusiness, SessionMembership, SessionMode } from '@/types/session'

/**
 * WorkspaceProvider — contexto ativo de UX (NÃO é autorização; o servidor valida sempre).
 * Regras congeladas: mode != role; OWNER/MANAGER → modo OWNER; EMPLOYEE → PROFESSIONAL;
 * CustomerProfile → CUSTOMER. Resolução nunca por índice não-validado:
 *  - preferência válida vence;
 *  - escolha única (1 opção compatível) é resolvida diretamente;
 *  - ambíguo → needsSelection=true e o WorkspaceGate coleta escolha explícita.
 */

interface WorkspaceCache {
  activeMode: SessionMode | null
  activeBusinessId: string | null
  activeLocationId: string | null
}

interface WorkspaceContextType {
  activeMode: SessionMode | null
  activeBusiness: SessionBusiness | null
  activeMembership: SessionMembership | null
  activeLocationId: string | null
  permissions: string[]
  needsSelection: boolean
  isContextReady: boolean
  /** Businesses compatíveis com o activeMode (membership com role que mapeia para o modo). */
  businessesForMode: SessionBusiness[]
  hasPermission: (p: string) => boolean
  switchMode: (mode: SessionMode) => void
  switchBusiness: (businessId: string) => void
  switchLocation: (locationId: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)
const CACHE_KEY = 'agendaqui:workspace'

const MODE_ROLES: Record<SessionMode, SessionMembership['role'][]> = {
  OWNER: ['OWNER', 'MANAGER'],
  PROFESSIONAL: ['EMPLOYEE'],
  CUSTOMER: [],
}

function loadCache(): WorkspaceCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        activeMode: p.activeMode ?? null,
        activeBusinessId: p.activeBusinessId ?? null,
        activeLocationId: p.activeLocationId ?? null,
      }
    }
  } catch {
    // ignore
  }
  return { activeMode: null, activeBusinessId: null, activeLocationId: null }
}

function saveCache(c: WorkspaceCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {
    // ignore
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session, isSessionLoading } = useSession()
  const queryClient = useQueryClient()
  const [cache, setCache] = useState<WorkspaceCache>(loadCache)

  const availableModes = session?.availableModes ?? []

  // preference do contrato só é usada se válida contra o catálogo
  const prefMode = session?.preferences.activeMode ?? null
  const prefBusinessId = session?.preferences.activeBusinessId ?? null

  const activeMode = useMemo<SessionMode | null>(() => {
    if (!session) return null
    if (cache.activeMode && availableModes.includes(cache.activeMode)) return cache.activeMode
    if (prefMode && availableModes.includes(prefMode)) return prefMode
    if (availableModes.length === 1) return availableModes[0]
    return null // ambíguo → seleção explícita
  }, [session, cache.activeMode, prefMode, availableModes])

  const businessesForMode = useMemo<SessionBusiness[]>(() => {
    if (!session || !activeMode) return []
    if (activeMode === 'CUSTOMER') return []
    const roles = MODE_ROLES[activeMode]
    return session.businesses.filter((b) => b.memberships.some((m) => roles.includes(m.role)))
  }, [session, activeMode])

  const activeBusiness = useMemo<SessionBusiness | null>(() => {
    if (!session || !activeMode || activeMode === 'CUSTOMER') return null
    const candidates = businessesForMode
    const cached = candidates.find((b) => b.id === cache.activeBusinessId)
    if (cached) return cached
    const pref = candidates.find((b) => b.id === prefBusinessId)
    if (pref) return pref
    if (candidates.length === 1) return candidates[0] // escolha única ≠ fallback por índice
    return null
  }, [session, activeMode, businessesForMode, cache.activeBusinessId, prefBusinessId])

  const activeMembership = useMemo<SessionMembership | null>(() => {
    if (!activeBusiness || !activeMode) return null
    const roles = MODE_ROLES[activeMode]
    return activeBusiness.memberships.find((m) => roles.includes(m.role)) ?? null
  }, [activeBusiness, activeMode])

  const locationIds = activeMembership?.locationIds ?? []
  const activeLocationId = useMemo<string | null>(() => {
    if (cache.activeLocationId && locationIds.includes(cache.activeLocationId)) return cache.activeLocationId
    if (locationIds.length === 1) return locationIds[0]
    return null // múltiplos locais = escopo amplo (sem filtro) até escolha explícita
  }, [cache.activeLocationId, locationIds])

  const permissions = activeMembership?.permissions ?? []

  const needsSelection =
    !!session &&
    !isSessionLoading &&
    (availableModes.length === 0 ||
      activeMode === null ||
      (activeMode !== 'CUSTOMER' && businessesForMode.length === 0) ||
      (activeMode !== 'CUSTOMER' && activeBusiness === null))

  const isContextReady = !!session && !needsSelection

  const apply = (patch: Partial<WorkspaceCache>) => {
    setCache((prev) => {
      const next = { ...prev, ...patch }
      saveCache(next)
      return next
    })
    void queryClient.invalidateQueries()
  }

  const switchMode = (mode: SessionMode) => {
    if (!availableModes.includes(mode)) return
    // business/location só são válidos se compatíveis com o novo modo
    const roles = MODE_ROLES[mode]
    const keepBusiness =
      mode !== 'CUSTOMER' &&
      session?.businesses.some(
        (b) => b.id === activeBusiness?.id && b.memberships.some((m) => roles.includes(m.role))
      )
    apply({
      activeMode: mode,
      activeBusinessId: keepBusiness ? activeBusiness!.id : null,
      activeLocationId: null,
    })
  }

  const switchBusiness = (businessId: string) => {
    if (!businessesForMode.some((b) => b.id === businessId)) return
    apply({ activeBusinessId: businessId, activeLocationId: null })
  }

  const switchLocation = (locationId: string) => {
    if (!locationIds.includes(locationId)) return
    apply({ activeLocationId: locationId })
  }

  const hasPermission = (p: string) => permissions.includes(p)

  return (
    <WorkspaceContext.Provider
      value={{
        activeMode,
        activeBusiness,
        activeMembership,
        activeLocationId,
        permissions,
        needsSelection,
        isContextReady,
        businessesForMode,
        hasPermission,
        switchMode,
        switchBusiness,
        switchLocation,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
