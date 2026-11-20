import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notify } from '@/lib/notify'
import { useSession } from './session'
import { sessionApi } from '@/services/api/session'
import { extractApiMessage, extractApiStatus } from '@/lib/api-error'
import type { MeSession, SessionBusiness, SessionMembership, SessionMode } from '@/types/session'

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
  /** Modos do catálogo que são realmente utilizáveis por este usuário. */
  availableModes: SessionMode[]
  /** Businesses compatíveis com o activeMode (membership com role que mapeia para o modo). */
  businessesForMode: SessionBusiness[]
  hasPermission: (p: string) => boolean
  switchMode: (mode: SessionMode) => void
  switchBusiness: (businessId: string) => void
  switchLocation: (locationId: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)
const CACHE_KEY = 'agendaqui:workspace'
const EMPTY_MODES: SessionMode[] = []

/** mode → roles de membership que dão acesso a esse mode (contrato congelado). */
const MODE_ROLES: Record<SessionMode, SessionMembership['role'][]> = {
  OWNER: ['OWNER', 'MANAGER'],
  PROFESSIONAL: ['EMPLOYEE'],
  CUSTOMER: [],
}

/**
 * Businesses compatíveis com um mode.
 * PROFESSIONAL exige membership EMPLOYEE (uma membership MANAGER/OWNER NÃO
 * habilita o modo PROFESSIONAL) — sem isso um usuário só-MANAGER ficava
 * preso entre "modo sem negócio" e o seletor, em loop.
 */
function compatibleBusinesses(session: MeSession, mode: SessionMode): SessionBusiness[] {
  if (mode === 'CUSTOMER') return []
  const roles = MODE_ROLES[mode]
  return session.businesses.filter((b) => b.memberships.some((m) => roles.includes(m.role)))
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

  const catalogModes = session?.availableModes ?? EMPTY_MODES

  /* Modos realmente utilizáveis: um modo do catálogo que não tem nenhum
   * business compatível (nem profile no caso de CUSTOMER) é um modo morto —
   * resolvê-lo deixaria o usuário sem contexto e sem como sair. */
  const availableModes = useMemo<SessionMode[]>(() => {
    if (!session) return []
    return catalogModes.filter((mode) => {
      if (mode === 'CUSTOMER') return session.customerProfile !== null
      return compatibleBusinesses(session, mode).length > 0
    })
  }, [session, catalogModes])

  // preference do contrato só é usada se válida contra o catálogo
  const prefMode = session?.preferences.activeMode ?? null
  const prefBusinessId = session?.preferences.activeBusinessId ?? null

  const activeMode = useMemo<SessionMode | null>(() => {
    if (!session) return null
    /* Ordem: cache local → preferência do servidor → escolha única.
     * Cada candidato precisa ser UTILIZÁVEL (não basta estar no catálogo). */
    const candidates = [cache.activeMode, prefMode]
    for (const candidate of candidates) {
      if (candidate && availableModes.includes(candidate)) return candidate
    }
    if (availableModes.length === 1) return availableModes[0]
    return null // ambíguo → seleção explícita
  }, [session, cache.activeMode, prefMode, availableModes])

  const businessesForMode = useMemo<SessionBusiness[]>(() => {
    if (!session || !activeMode) return []
    return compatibleBusinesses(session, activeMode)
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
    /* Invalida os dados dependentes do contexto, mas NÃO o perfil
     * (`auth/me`), que não muda com a troca de modo/business. */
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    })
  }

  /* Persistência fire-and-forget (PATCH /me/preferences): a UI nunca espera o round-trip.
   * Falha de persistência NUNCA desfaz o contexto local escolhido — o servidor revalida
   * contra o catálogo no próximo GET /me/session (preferences stale são tratadas como hint).
   * A falha, porém, é MOSTRADA: o backend responde 403 quando o modo/business pedido
   * não está no catálogo do usuário — silenciar isso deixava o usuário sem retorno. */
  const persistPreferences = (patch: { activeMode?: SessionMode | null; activeBusinessId?: string | null }) => {
    sessionApi.updatePreferences(patch).catch((error: unknown) => {
      const status = extractApiStatus(error)
      const message = extractApiMessage(error)

      if (status === 403) {
        notify.error(message ?? 'Modo ou negócio indisponível para a sua conta.')
        return
      }

      if (!status) {
        notify.error('Sem conexão. Suas preferências não foram salvas.')
        return
      }

      notify.error(message ?? 'Não foi possível salvar suas preferências.')
    })
  }

  const switchMode = (mode: SessionMode) => {
    if (!catalogModes.includes(mode)) return

    /* Modo sem negócio compatível (ex.: PROFESSIONAL sem membership EMPLOYEE)
     * não é selecionável — e não é persistido, para não gerar um 403 garantido. */
    if (!availableModes.includes(mode)) {
      notify.error('Este modo não está disponível para a sua conta.')
      return
    }

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
    persistPreferences({ activeMode: mode, activeBusinessId: keepBusiness ? activeBusiness!.id : null })
  }

  const switchBusiness = (businessId: string) => {
    if (!businessesForMode.some((b) => b.id === businessId)) return
    apply({ activeBusinessId: businessId, activeLocationId: null })
    persistPreferences({ activeBusinessId: businessId })
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
        availableModes,
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
