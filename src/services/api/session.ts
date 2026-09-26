import { apiClient } from '@/lib/axios/client'
import type { MeSession } from '@/types/session'

/* CONTRACT FREEZE (docs/CONTRACT-me-session.md) — MOCK-FIRST.
 * Resolução de sessão/contexto pós-login. Leitura-only, sem autorização no client. */
export const sessionApi = {
  getSession: async (): Promise<MeSession> => {
    const { data } = await apiClient.get<MeSession>('me/session')
    return data
  },
}
