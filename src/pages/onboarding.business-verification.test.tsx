import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { BusinessVerification } from '@/types/business-verification'

/**
 * Rota de acompanhamento `/onboarding/business-verification` — O-08, O-09,
 * O-11, O-12, O-13.
 *
 * A tela é somente leitura. Ela mostra o estado que o backend informa e, em
 * APPROVED, refaz a sessão e deixa o D8 agir. Nenhum `businesses[0]`.
 */

const getMy = vi.fn()
vi.mock('@/services/api/business-verification', () => ({
  businessVerificationApi: {
    getMy: (...a: unknown[]) => getMy(...a),
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    presignDocument: vi.fn(),
    completeDocument: vi.fn(),
  },
}))

const refreshSession = vi.fn()
vi.mock('@/app/providers/session', () => ({
  useSession: () => ({ session: null, isSessionLoading: false, refreshSession }),
}))

const updatePreferences = vi.fn()
vi.mock('@/services/api/session', () => ({
  sessionApi: {
    getSession: vi.fn(async () => ({
      user: { id: 'u1' },
      availableModes: ['OWNER'],
      businesses: [{ id: 'biz_approved' }],
      customerProfile: { id: 'u1' },
      isPlatformAdmin: false,
      preferences: { activeMode: null, activeBusinessId: null },
    })),
    updatePreferences: (...a: unknown[]) => updatePreferences(...a),
  },
}))

import OnboardingBusinessVerificationPage from './onboarding.business-verification'

function output(overrides: Partial<BusinessVerification> = {}): BusinessVerification {
  return {
    verificationId: 'v1',
    status: 'PENDING',
    businessType: 'COMPANY',
    document: '04252011000110',
    tradeName: 'Barbearia Teste',
    legalName: null,
    responsibleName: null,
    responsibleCpf: null,
    categoryId: 'cat_1',
    phone: null,
    timezone: null,
    attendanceType: null,
    address: null,
    latitude: null,
    longitude: null,
    attemptCount: 1,
    maxAttempts: 3,
    canResubmit: true,
    requiredDocumentTypes: ['COMPROVANTE_CNPJ'],
    submittedDocumentTypes: ['COMPROVANTE_CNPJ'],
    missingDocumentTypes: [],
    submittedAt: new Date().toISOString(),
    decidedAt: null,
    expiresAt: null,
    rejectionReason: null,
    rejectionComment: null,
    approvedBusinessId: null,
    ...overrides,
  }
}

const EMPTY = output({
  verificationId: null,
  status: null,
  businessType: null,
  document: null,
  tradeName: null,
  categoryId: null,
  requiredDocumentTypes: [],
  submittedDocumentTypes: [],
  missingDocumentTypes: [],
})

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="path">{loc.pathname}</div>
}

function mount(state: BusinessVerification, options: { rejectWith?: unknown } = {}) {
  if (options.rejectWith) getMy.mockRejectedValue(options.rejectWith)
  else getMy.mockResolvedValue(state)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/onboarding/business-verification']}>
        <OnboardingBusinessVerificationPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  updatePreferences.mockResolvedValue(undefined)
})
afterEach(() => cleanup())

describe('rota de acompanhamento', () => {
  it('O-08: PENDING mostra a tela de análise e NÃO oferece edição', async () => {
    mount(output({ status: 'PENDING' }))

    await waitFor(() => expect(screen.getByText('Solicitação em análise')).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Editar solicitação' })).toBeNull()
    expect(screen.getByTestId('path').textContent).toBe('/onboarding/business-verification')
  })

  it('O-11: REJECTED mostra o motivo, os rótulos e o contador de tentativas', async () => {
    mount(
      output({
        status: 'REJECTED',
        attemptCount: 2,
        rejectionReason: 'DOCUMENT_ILLEGIBLE',
        rejectionComment: 'A foto está sem foco.',
      }),
    )

    await waitFor(() => expect(screen.getByText('Solicitação rejeitada')).toBeTruthy())
    expect(screen.getByTestId('rejection-label').textContent).toBe('Documento ilegível')
    expect(screen.getByTestId('rejection-comment').textContent).toBe('A foto está sem foco.')
    expect(screen.getByTestId('rejection-attempts').textContent).toContain('Tentativa 2 de 3')
    // REJECTED NÃO oferece edição direta: a write-path do backend só aceita
    // DRAFT/PENDING; a reabertura é via request-resend da plataforma.
    expect(screen.queryByRole('button', { name: 'Editar solicitação' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Abrir nova verificação' })).toBeNull()
  })

  it('O-12: EXPIRED avisa e oferece abrir NOVA verificação', async () => {
    mount(output({ status: 'EXPIRED' }))
    await waitFor(() => expect(screen.getByText('Verificação expirada')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Abrir nova verificação' })).toBeTruthy()
  })

  it('O-13: CANCELLED avisa e oferece abrir NOVA verificação', async () => {
    mount(output({ status: 'CANCELLED' }))
    await waitFor(() => expect(screen.getByText('Solicitação cancelada')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Abrir nova verificação' })).toBeTruthy()
  })

  it('sem solicitação, convida a começar a verificação', async () => {
    mount(EMPTY)
    await waitFor(() => expect(screen.getByText('Nenhuma verificação em andamento')).toBeTruthy())
  })

  it('O-09: APPROVED refaz a sessão e vai ao dashboard', async () => {
    mount(output({ status: 'APPROVED', approvedBusinessId: 'biz_approved' }))

    await waitFor(() => expect(refreshSession).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'))
  })

  it('O-10: APPROVED aciona o D8 pelo hook existente, com approvedBusinessId', async () => {
    mount(output({ status: 'APPROVED', approvedBusinessId: 'biz_approved' }))

    await waitFor(() => expect(updatePreferences).toHaveBeenCalled(), { timeout: 3000 })
    expect(updatePreferences).toHaveBeenCalledWith({
      activeMode: 'OWNER',
      activeBusinessId: 'biz_approved',
    })
  })

  it('erro de leitura mostra o motivo em vez de "algo deu errado"', async () => {
    mount(output(), {
      rejectWith: new AxiosError('erro', '500', undefined, undefined, {
        status: 500,
        data: {},
        statusText: '',
        headers: {},
        config: {} as never,
      }),
    })

    await waitFor(() => expect(screen.getByText(/erro 500/)).toBeTruthy())
  })
})
