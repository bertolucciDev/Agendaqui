import { describe, it, expect, vi } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { QueryClient, type MutationCache } from '@tanstack/react-query'
import { createD8Attempt, d8RetryPredicate, isRetryableD8Error } from '../d8-writer'
import type { MeSession } from '@/types/session'
import type { BusinessVerification } from '@/types/business-verification'

/* T1–T5, T8, T9 — orçamento, revalidação e concorrência.
 *
 * `retryDelay: 0` é usado só para encurtar o relógio: o que está sob teste é a
 * contagem de tentativas e a reavaliação, não o backoff (que é 2s/4s na lib). */

const APPROVED: BusinessVerification = {
  verificationId: 'verif_1',
  status: 'APPROVED',
  approvedBusinessId: 'bus_1',
  businessType: 'INDIVIDUAL',
  document: '11144477735',
  tradeName: 'Studio',
  legalName: null,
  responsibleName: null,
  responsibleCpf: null,
  categoryId: 'cat_1',
  phone: null,
  timezone: 'America/Sao_Paulo',
  attendanceType: 'AT_LOCATION',
  address: null,
  latitude: null,
  longitude: null,
  attemptCount: 0,
  maxAttempts: 3,
  canResubmit: false,
  requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
  submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
  missingDocumentTypes: [],
  submittedAt: '2026-01-01T00:00:00.000Z',
  decidedAt: '2026-01-02T00:00:00.000Z',
  expiresAt: '2026-07-01T00:00:00.000Z',
  rejectionReason: null,
  rejectionComment: null,
}

const TARGET = { watchedVerificationId: 'verif_1', targetBusinessId: 'bus_1' }

const transportError = () => new AxiosError('timeout of 0ms exceeded', 'ECONNABORTED')
const statusError = (status: number) =>
  new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, { status } as AxiosResponse)

function sessionOf(activeBusinessId: string | null, businesses: string[]): MeSession {
  return {
    user: { id: 'u_1' },
    availableModes: ['OWNER', 'CUSTOMER'],
    businesses: businesses.map((id) => ({ id, name: id, memberships: [] })),
    customerProfile: null,
    isPlatformAdmin: false,
    preferences: { activeMode: null, activeBusinessId },
  }
}

/** Servidor simulado: estado persistido + contagem de escritas. */
function createServer(init: { activeBusinessId?: string | null; businesses?: string[]; verification?: Partial<BusinessVerification> } = {}) {
  const state = {
    activeBusinessId: init.activeBusinessId ?? null,
    businesses: init.businesses ?? ['bus_1'],
    verification: { ...APPROVED, ...init.verification },
  }
  let pendingFailures = 0
  const writes: string[] = []
  const reads = { verification: 0, session: 0 }

  const deps = {
    getVerification: vi.fn(async (): Promise<BusinessVerification> => {
      reads.verification += 1
      return state.verification
    }),
    getSession: vi.fn(async (): Promise<MeSession> => {
      reads.session += 1
      return sessionOf(state.activeBusinessId, state.businesses)
    }),
    updatePreferences: vi.fn(async (patch: { activeMode: 'OWNER'; activeBusinessId: string }) => {
      writes.push(patch.activeBusinessId)
      if (pendingFailures > 0) {
        pendingFailures -= 1
        throw transportError()
      }
      state.activeBusinessId = patch.activeBusinessId
      return state.activeBusinessId
    }),
  }

  return {
    deps,
    state,
    writes,
    reads,
    failNextPatch: (n: number) => {
      pendingFailures = n
    },
    choose: (businessId: string) => {
      state.activeBusinessId = businessId
    },
  }
}

/** Executa uma execução lógica de D8 com orçamento real do React Query. */
function runD8(cache: MutationCache, server: ReturnType<typeof createServer>, target = TARGET) {
  const client = new QueryClient()
  const mutation = cache.build(client, {
    mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
    retry: d8RetryPredicate,
    retryDelay: 0,
  })
  return mutation.execute(target)
}

describe('classificação de erro (D8)', () => {
  it('sem resposta é transitoria e consome orçamento', () => {
    expect(isRetryableD8Error(transportError())).toBe(true)
  })

  it('5xx é transitoria', () => {
    expect(isRetryableD8Error(statusError(502))).toBe(true)
    expect(isRetryableD8Error(statusError(503))).toBe(true)
  })

  it('403 é permanente: insistir seria insistir numa falha que não se resolve sozinha', () => {
    expect(isRetryableD8Error(statusError(403))).toBe(false)
  })

  it('401 e 429 não consomem orçamento', () => {
    expect(isRetryableD8Error(statusError(401))).toBe(false)
    expect(isRetryableD8Error(statusError(429))).toBe(false)
  })

  it('erro não-axios não consome orçamento', () => {
    expect(isRetryableD8Error(new Error('boom'))).toBe(false)
  })
})

describe('T1 — falha de transporte, refetch com preferência ainda nula, retry conclui', () => {
  it('gasta 2 requests de escrita e conclui D8', async () => {
    const client = new QueryClient()
    const server = createServer()
    server.failNextPatch(1)

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    const decision = await mutation.execute(TARGET)

    expect(server.writes).toEqual(['bus_1', 'bus_1'])
    expect(decision).toEqual({ outcome: 'write' })
    expect(server.state.activeBusinessId).toBe('bus_1')
    // cada tentativa revalida por rede: 2 leituras de sessão, 2 de verificação
    expect(server.reads.session).toBe(2)
  })

  it('esgota o orçamento em 3 tentativas sem concluir', async () => {
    const client = new QueryClient()
    const server = createServer()
    server.failNextPatch(5)

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    await expect(mutation.execute(TARGET)).rejects.toThrow()

    expect(server.writes).toHaveLength(3) // 1 inicial + 2 retries
  })
})

describe('T2 — usuário escolhe A entre as tentativas', () => {
  it('não executa o 2º PATCH e preserva a escolha manual', async () => {
    const client = new QueryClient()
    const server = createServer({ businesses: ['bus_1', 'bus_2'] })
    server.failNextPatch(1)
    // o usuário escolhe A enquanto a 1ª tentativa está em voo
    const original = server.deps.updatePreferences
    server.deps.updatePreferences = vi.fn(async (patch) => {
      const result = await original(patch).catch(() => {
        server.choose('bus_2')
        throw transportError()
      })
      return result
    })

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    const decision = await mutation.execute(TARGET)

    expect(decision).toEqual({ outcome: 'skipped', reason: 'MANUAL_CHOICE_PRESERVED' })
    expect(server.state.activeBusinessId).toBe('bus_2')
  })
})

describe('T3 — o servidor gravou, a resposta se perdeu', () => {
  it('conclui por leitura, com 0 novas escritas', async () => {
    const client = new QueryClient()
    // o servidor JÁ tem bus_1: a resposta do PATCH anterior foi perdida
    const server = createServer({ activeBusinessId: 'bus_1' })

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    const decision = await mutation.execute(TARGET)

    expect(decision).toEqual({ outcome: 'completed' })
    expect(server.writes).toEqual([])
  })
})

describe('T4 — o alvo sai do catálogo entre as tentativas', () => {
  it('encerra com motivo, sem 2º PATCH', async () => {
    const client = new QueryClient()
    const server = createServer()
    server.failNextPatch(1)
    const original = server.deps.updatePreferences
    server.deps.updatePreferences = vi.fn(async (patch) => {
      try {
        return await original(patch)
      } catch (e) {
        server.state.businesses = [] // B removido do catálogo
        throw e
      }
    })

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    const decision = await mutation.execute(TARGET)

    expect(decision).toEqual({ outcome: 'skipped', reason: 'BUSINESS_NOT_IN_CATALOG' })
    expect(server.writes).toEqual(['bus_1'])
  })
})

describe('T5 — a verificação muda entre as tentativas', () => {
  it('encerra com VERIFICATION_CHANGED, sem 2º PATCH', async () => {
    const client = new QueryClient()
    const server = createServer()
    server.failNextPatch(1)
    const original = server.deps.updatePreferences
    server.deps.updatePreferences = vi.fn(async (patch) => {
      try {
        return await original(patch)
      } catch (e) {
        server.state.verification = { ...server.state.verification, verificationId: 'verif_2' }
        throw e
      }
    })

    const mutation = client.getMutationCache().build(client, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 0,
    })
    const decision = await mutation.execute(TARGET)

    expect(decision).toEqual({ outcome: 'skipped', reason: 'VERIFICATION_CHANGED' })
    expect(server.writes).toEqual(['bus_1'])
  })
})

describe('T8 — duas abas escrevendo B', () => {
  it('convergem em B; valor absoluto não tem lost update', async () => {
    const server = createServer()

    const [a, b] = await Promise.all([
      runD8(new QueryClient().getMutationCache(), server),
      runD8(new QueryClient().getMutationCache(), server),
    ])

    expect(a).toEqual({ outcome: 'write' })
    expect(b).toEqual({ outcome: 'write' })
    expect(server.writes).toEqual(['bus_1', 'bus_1'])
    expect(server.state.activeBusinessId).toBe('bus_1')
  })
})

describe('T9 — aba 1 falhando enquanto a aba 2 escolhe A', () => {
  it('B nunca sobrescreve A', async () => {
    const server = createServer({ businesses: ['bus_1', 'bus_2'] })
    server.failNextPatch(1)

    // "Outra aba" muda a preferência DURANTE a janela de backoff da aba 1:
    // a 1ª tentativa já escreveu (e falhou), a escolha cai antes do refetch do retry.
    const original = server.deps.updatePreferences
    server.deps.updatePreferences = vi.fn(async (patch) => {
      const result = await original(patch).catch((e) => {
        setTimeout(() => server.choose('bus_2'), 10)
        throw e
      })
      return result
    })

    const client1 = new QueryClient()
    const mutation1 = client1.getMutationCache().build(client1, {
      mutationFn: (t: typeof TARGET) => createD8Attempt(server.deps, t)(),
      retry: d8RetryPredicate,
      retryDelay: 40,
    })
    const decision = await mutation1.execute(TARGET)

    expect(decision).toEqual({ outcome: 'skipped', reason: 'MANUAL_CHOICE_PRESERVED' })
    expect(server.writes).toEqual(['bus_1']) // só a 1ª, que falhou
    expect(server.state.activeBusinessId).toBe('bus_2')
  })
})
