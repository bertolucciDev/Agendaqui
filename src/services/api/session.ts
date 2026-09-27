import { apiClient } from '@/lib/axios/client'
import type { MeSession, SessionMode, SessionPreferences } from '@/types/session'

/* CONTRACT FREEZE (docs/CONTRACT-me-session.md) — MOCK-FIRST.
 * Resolução de sessão/contexto pós-login. Leitura-only, sem autorização no client. */
export const sessionApi = {
  getSession: async (): Promise<MeSession> => {
    const { data } = await apiClient.get<MeSession>('me/session')
    return data
  },

  /** PATCH /me/preferences — parcial: omitido = não alterar; valor = atualizar; null = limpar.
   *  Preferences são UX-only; o backend permanece a autoridade (valida catálogo). */
  updatePreferences: async (payload: {
    activeMode?: SessionMode | null
    activeBusinessId?: string | null
  }): Promise<SessionPreferences> => {
    const { data } = await apiClient.patch<SessionPreferences>('me/preferences', payload)
    return data
  },
}
