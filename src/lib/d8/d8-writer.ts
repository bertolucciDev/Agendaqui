import { isAxiosError } from 'axios'
import { evaluateD8, type D8Decision } from './evaluate-d8'
import type { MeSession } from '@/types/session'
import type { BusinessVerification } from '@/types/business-verification'

/* Escritor de D8.
 *
 * Cada TENTATIVA é uma nova avaliação: leitura de rede, decisão, escrita condicional.
 * Nunca "PATCH e repara". O retryer da biblioteca só cuida do intervalo e do limite —
 * ele repete `mutationFn`, e como a revalidação mora dentro dele, a repetição vem
 * reavaliada por construção (E-17). */

export interface D8Target {
  /** `verificationId` observado no disparo do gatilho (V-1). */
  watchedVerificationId: string | null
  /** `approvedBusinessId` observado no disparo do gatilho (V-3). */
  targetBusinessId: string
}

export interface D8WriterDeps {
  /** Leitura de rede de `GET /me/business-verification`. */
  getVerification: () => Promise<BusinessVerification>
  /** Leitura de rede de `GET /me/session`, sem passar pelo cache do React Query. */
  getSession: () => Promise<MeSession>
  /** `PATCH /me/preferences`. */
  updatePreferences: (patch: { activeMode: 'OWNER'; activeBusinessId: string }) => Promise<unknown>
}

export type D8Attempt = () => Promise<D8Decision>

/** Uma execução lógica de D8 = um alvo. Cada chamada a `attempt` reavalia tudo. */
export function createD8Attempt(deps: D8WriterDeps, target: D8Target): D8Attempt {
  return async () => {
    const [verification, session] = await Promise.all([
      deps.getVerification(),
      deps.getSession(),
    ])

    const decision = evaluateD8({ ...target, verification, session })

    if (decision.outcome !== 'write') {
      // Condição reprovada NÃO é falha: resolve com sentinela e o retryer encerra
      // sem consumir orçamento. (Rejeitar faria o predicado repetir uma decisão.)
      return decision
    }

    await deps.updatePreferences({
      activeMode: 'OWNER',
      activeBusinessId: target.targetBusinessId,
    })

    return { outcome: 'write' } as D8Decision
  }
}

/**
 * Classificação de erro fechada do gate.
 *
 * Só falha TRANSITÓRIA consome orçamento. `403` é o exemplo canônico de permanente:
 * é a falha esperada quando o alvo não pertence ao usuário, e insistir nela é
 * insistir numa falha que não se resolve sozinha.
 */
export function isRetryableD8Error(error: unknown): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status
    if (status === undefined) return true // sem resposta: transporte (E-19)
    if (status === 401 || status === 429) return false
    if (status >= 500) return true
    return false // 4xx permanente (403, 404, 409, 422...)
  }
  // Erro não-axios não é falha de transporte classificável: não consome orçamento.
  return false
}

/** `retry: 2` ⇒ 1 tentativa inicial + 2 retries = 3 requests no máximo (E-13). */
export const D8_RETRY = 2

export const d8RetryPredicate = (failureCount: number, error: unknown): boolean =>
  failureCount < D8_RETRY && isRetryableD8Error(error)
