import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { createD8Attempt, d8RetryPredicate, type D8Target } from '@/lib/d8/d8-writer'
import type { D8Decision } from '@/lib/d8/evaluate-d8'
import type { MeSession } from '@/types/session'
import type { BusinessVerification } from '@/types/business-verification'
import { useBusinessVerification } from '../use-business-verification'

/* T6, T6b, T6c, T7 — sobrevivência ao unmount e natureza dos callbacks.
 *
 * São os únicos testes que dependem de comportamento de biblioteca, e existem
 * para PROVAR (não supor) por que o D8 liga o desfecho em callback de hook. */

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

const TARGET: D8Target = { watchedVerificationId: 'verif_1', targetBusinessId: 'bus_1' }
const TIMEOUT = () => new AxiosError('timeout of 0ms exceeded', 'ECONNABORTED')

const getMy = vi.fn(async (): Promise<BusinessVerification> => APPROVED)
const getSession = vi.fn(
  async (): Promise<MeSession> => ({
    user: { id: 'u_1' },
    availableModes: ['OWNER', 'CUSTOMER'],
    businesses: [{ id: 'bus_1', name: 'Studio', memberships: [] }],
    customerProfile: null,
    isPlatformAdmin: false,
    preferences: { activeMode: null, activeBusinessId: null },
  }),
)
const updatePreferences = vi.fn(async (_payload: { activeMode: 'OWNER'; activeBusinessId: string }) => null)

vi.mock('@/services/api/business-verification', () => ({
  businessVerificationApi: { getMy: () => getMy() },
}))
vi.mock('@/services/api/session', () => ({
  sessionApi: {
    getSession: () => getSession(),
    updatePreferences: (p: { activeMode: 'OWNER'; activeBusinessId: string }) => updatePreferences(p),
  },
}))

const d8Deps = {
  getVerification: () => getMy(),
  getSession: () => getSession(),
  updatePreferences: (p: { activeMode: 'OWNER'; activeBusinessId: string }) => updatePreferences(p),
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function Wrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** Reproduz o D8 permitindo escolher ONDE o desfecho é ligado. */
function D8Harness({
  style,
  onOutcome,
}: {
  style: 'hook' | 'per-call'
  onOutcome: (d: D8Decision) => void
}) {
  const mutation = useMutation<D8Decision, unknown, D8Target>({
    mutationFn: (target) => createD8Attempt(d8Deps, target)(),
    retry: d8RetryPredicate,
    onSuccess: style === 'hook' ? onOutcome : undefined,
  })

  return (
    <button
      type="button"
      onClick={() => {
        if (style === 'per-call') {
          mutation.mutate(TARGET, { onSuccess: onOutcome })
        } else {
          mutation.mutate(TARGET)
        }
      }}
    >
      fire
    </button>
  )
}

function VerificationObserver() {
  const { d8Outcome } = useBusinessVerification()
  return <div data-testid="outcome">{d8Outcome ?? 'idle'}</div>
}

const writeCount = () => updatePreferences.mock.calls.length

/**
 * Comportamento do PATCH. Usa `mockImplementation` com contador local em vez de
 * `...Once`: testes anteriores deixam retryers vivos por alguns segundos, e uma
 * fila de "uma vez" seria consumida pelo retryer do teste anterior, não pelo
 * teste corrente.
 */
function setWrites(behavior: 'ok' | 'always-timeout' | 'timeout-once') {
  if (behavior === 'ok') {
    updatePreferences.mockResolvedValue(null)
    return
  }
  let first = true
  updatePreferences.mockImplementation(async () => {
    if (behavior === 'always-timeout' || first) {
      first = false
      throw TIMEOUT()
    }
    return null
  })
}

/** Aguarda o retryer actual esgotar, para não vazar timer para o teste seguinte. */
async function drain() {
  await waitFor(() => expect(writeCount()).toBe(3), { timeout: 10_000 })
}

beforeEach(() => {
  vi.clearAllMocks()
  getMy.mockImplementation(async () => APPROVED)
  getSession.mockImplementation(async () => ({
    user: { id: 'u_1' },
    availableModes: ['OWNER', 'CUSTOMER'],
    businesses: [{ id: 'bus_1', name: 'Studio', memberships: [] }],
    customerProfile: null,
    isPlatformAdmin: false,
    preferences: { activeMode: null, activeBusinessId: null },
  }))
  setWrites('ok')
})

describe('T6 — unmount durante o backoff', () => {
  it('o retry EXECUTA mesmo com o componente desmontado', async () => {
    setWrites('always-timeout')
    const client = newClient()

    const { unmount } = render(
      <Wrapper client={client}>
        <VerificationObserver />
      </Wrapper>,
    )

    await waitFor(() => expect(writeCount()).toBe(1))

    // desmonta com o backoff pendente
    unmount()
    cleanup()

    // o retryer pertence à Mutation, não ao componente: ele continua (E-01, E-03, E-06)
    await waitFor(() => expect(writeCount()).toBeGreaterThanOrEqual(2), { timeout: 5000 })
    await drain()
  })
})

describe('T6b — desfecho ligado em callback por chamada', () => {
  it('NÃO dispara após o unmount', async () => {
    setWrites('always-timeout')
    const client = newClient()
    const onOutcome = vi.fn()

    const { unmount } = render(
      <Wrapper client={client}>
        <D8Harness style="per-call" onOutcome={onOutcome} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    await waitFor(() => expect(writeCount()).toBe(1))

    unmount()
    cleanup()

    // o retry até executa, mesmo após o unmount...
    await drain()
    // ...mas o callback por chamada foi descartado no unmount (E-09)
    expect(onOutcome).not.toHaveBeenCalled()
  })
})

describe('T6c — desfecho ligado em callback de hook', () => {
  it('DISPARA mesmo após o unmount', async () => {
    setWrites('timeout-once')
    const client = newClient()
    const onOutcome = vi.fn()

    const { unmount } = render(
      <Wrapper client={client}>
        <D8Harness style="hook" onOutcome={onOutcome} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    await waitFor(() => expect(writeCount()).toBe(1))

    unmount()
    cleanup()

    // `onSuccess` recebe (data, variables, context, mutation); o desfecho é o 1º argumento.
    await waitFor(() => expect(onOutcome).toHaveBeenCalled(), { timeout: 5000 })
    expect(onOutcome.mock.calls[0]?.[0]).toEqual({ outcome: 'write' })
  })
})

describe('T7 — recarga da página zera o orçamento', () => {
  it('a nova execução lógica recebe orçamento novo', async () => {
    setWrites('always-timeout')

    // 1ª carga: consome todo o orçamento (3 requests) enquanto está montada
    const first = newClient()
    const firstRender = render(
      <Wrapper client={first}>
        <VerificationObserver />
      </Wrapper>,
    )
    await waitFor(() => expect(writeCount()).toBe(1), { timeout: 5000 })
    firstRender.unmount()
    cleanup()

    // deixa a 1ª execução esgotar as próprias tentativas
    await waitFor(() => expect(writeCount()).toBe(3), { timeout: 8000 })
    const afterFirstLoad = writeCount()

    // recarga = contexto novo = orçamento novo
    const second = newClient()
    render(
      <Wrapper client={second}>
        <VerificationObserver />
      </Wrapper>,
    )

    // a 2ª execução ainda tem orçamento: ela TENTA DE NOVO
    await waitFor(() => expect(writeCount()).toBeGreaterThan(afterFirstLoad + 1), { timeout: 5000 })
  })
})
