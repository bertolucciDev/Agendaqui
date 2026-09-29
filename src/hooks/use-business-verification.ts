import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { businessVerificationApi } from '@/services/api/business-verification'
import { sessionApi } from '@/services/api/session'
import { createD8Attempt, d8RetryPredicate, type D8Target } from '@/lib/d8/d8-writer'
import type { D8Decision } from '@/lib/d8/evaluate-d8'
import type { BusinessVerification } from '@/types/business-verification'
import type { MeSession } from '@/types/session'

/* Polling só enquanto a solicitação está em aberto. Aprovada ou encerrada, a
 * leitura reativa para — não há nada a observar. */
const PENDING_POLL_MS = 10_000

export const businessVerificationKey = ['business-verification'] as const

export interface UseBusinessVerificationResult {
  verification: BusinessVerification | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  /** Desfecho da última execução lógica de D8, para diagnóstico. */
  d8Outcome: D8Decision['outcome'] | null
  /**
   * Refetch explícito. Usado pela rota de acompanhamento para reagir a uma
   * mudança de estado observada fora do polling, sem expor o `useQuery`
   * inteiro e sem duplicar a guarda de disparo do D8.
   */
  refetch: () => Promise<unknown>
}

const d8Deps = {
  getVerification: businessVerificationApi.getMy,
  // Leitura de rede crua: `fetchQuery` serviria cache, e a verdade é a rede.
  getSession: sessionApi.getSession,
  updatePreferences: (patch: { activeMode: 'OWNER'; activeBusinessId: string }) =>
    sessionApi.updatePreferences(patch),
}

/**
 * Acompanha a solicitação do titular e executa D8 na PRIMEIRA observação de
 * `APPROVED` (gatilho relocado — a criação agora ocorre no servidor, na
 * aprovação, e o cliente não tem onde observar o evento de criação).
 *
 * A revalidação e o retry vivem dentro do `mutationFn`, e não em callback do
 * componente: a navegação disparada por D8 desmonta a rota, e callbacks por
 * chamada são descartados no unmount (E-09). Callbacks de hook sobrevivem (E-10).
 */
export function useBusinessVerification(): UseBusinessVerificationResult {
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: businessVerificationKey,
    queryFn: businessVerificationApi.getMy,
    refetchInterval: (query) => {
      const status = (query.state.data as BusinessVerification | undefined)?.status
      return status === 'PENDING' || status === 'DRAFT' ? PENDING_POLL_MS : false
    },
  })

  // Uma execução lógica = uma `mutate()` = um orçamento de tentativas próprio.
  const d8 = useMutation<D8Decision, unknown, D8Target>({
    mutationFn: (target) => createD8Attempt(d8Deps, target)(),
    retry: d8RetryPredicate,
    onSuccess: (decision, target) => {
      if (decision.outcome === 'write' || decision.outcome === 'completed') {
        applyOptimisticWorkspace(queryClient, target.targetBusinessId)
      }
    },
  })

  // Dispara uma única vez por montagem: reobservar APPROVED não relança D8.
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const verification = data
    if (!verification || verification.status !== 'APPROVED') return
    const businessId = verification.approvedBusinessId
    if (!businessId) return

    firedRef.current = true
    d8.mutate({
      watchedVerificationId: verification.verificationId,
      targetBusinessId: businessId,
    })
  }, [data, d8])

  return {
    verification: data,
    isLoading,
    isFetching,
    error: (error as Error | null) ?? null,
    d8Outcome: d8.data?.outcome ?? null,
    /**
     * Refetch explícito do acompanhamento. A fatia 2 (rota
     * `/onboarding/business-verification`) usa isto para reagir a uma mudança
     * de estado observada fora do ciclo de polling, sem expor o `useQuery`
     * inteiro — e sem duplicar a guarda de disparo do D8.
     */
    refetch,
  }
}

/**
 * Projeção de UI do contexto OWNER. NÃO é evidência de conclusão (C-9): D8 decide
 * por leitura de rede; o cache existe só para a UI não piscar.
 *
 * O id é o `approvedBusinessId` já conhecido — nunca `businesses[0]`, que é
 * identificação por catálogo e está proibido (C-4).
 */
function applyOptimisticWorkspace(queryClient: QueryClient, businessId: string): void {
  queryClient.setQueryData<MeSession>(['session'], (previous) => {
    if (!previous) return previous
    if (previous.preferences.activeBusinessId !== null) return previous
    return {
      ...previous,
      preferences: { activeMode: 'OWNER', activeBusinessId: businessId },
    }
  })
}
