import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import type { BusinessVerification, BusinessVerificationDocumentType } from '@/types/business-verification'

/**
 * O-01..O-16 — onboarding do primeiro negócio via Business Verification.
 *
 * Prova central: o onboarding NÃO usa `POST /businesses` (O-16). O módulo
 * `@/services/api/businesses` é mockado com um `create` que LANÇA se chamado —
 * qualquer uso do endpoint morto quebra o teste, não só um `expect` posterior.
 */

const getMy = vi.fn()
const create = vi.fn()
const update = vi.fn()
const submit = vi.fn()
const cancel = vi.fn()
const presignDocument = vi.fn()
const completeDocument = vi.fn()


vi.mock('@/services/api/business-verification', () => ({
  businessVerificationApi: {
    getMy: (...a: unknown[]) => getMy(...a),
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
    submit: (...a: unknown[]) => submit(...a),
    cancel: (...a: unknown[]) => cancel(...a),
    presignDocument: (...a: unknown[]) => presignDocument(...a),
    completeDocument: (...a: unknown[]) => completeDocument(...a),
  },
}))

// O-16: o endpoint morto. Se o onboarding o tocar, a falha é explícita.
const legacyCreateBusiness = vi.fn((..._a: unknown[]) => {
  throw new Error('POST /businesses não pode ser usado (responde 410)')
})
vi.mock('@/services/api/businesses', () => ({
  businessesApi: { create: (...a: unknown[]) => legacyCreateBusiness(...a) },
}))

vi.mock('@/services/api/categories', () => ({
  categoriesApi: { list: vi.fn(async () => [{ id: 'cat_1', name: 'Barbearia', slug: 'barbearia' }]) },
}))

const refreshSession = vi.fn()
// Consequência do P-5: o wrapper do mock tem identidade ESTÁVEL. Antes, o mock
// criava uma função nova a cada render, o efeito APPROVED (que a tem como
// dependência) re-executava em laço e afogava a navegação (flake na suíte
// completa). A instabilidade era do mock, não da página.
const stableRefreshSession = (...a: unknown[]) => refreshSession(...a)
let uiSession: Record<string, unknown> = {
  user: { id: 'u_new' },
  availableModes: ['CUSTOMER'],
  businesses: [],
  customerProfile: { id: 'u_new' },
  isPlatformAdmin: false,
  preferences: { activeMode: null, activeBusinessId: null },
}
vi.mock('@/app/providers/session', () => ({
  useSession: () => ({
    session: uiSession,
    isSessionLoading: false,
    refreshSession: stableRefreshSession,
  }),
}))

const patchPreferences = vi.fn()
vi.mock('@/services/api/session', () => ({
  sessionApi: {
    getSession: vi.fn(async () => sessionState),
    updatePreferences: (...a: unknown[]) => patchPreferences(...a),
  },
}))

vi.mock('@/lib/verification/sha256', () => ({
  sha256Hex: vi.fn(async () => 'b'.repeat(64)),
}))

globalThis.fetch = vi.fn(async () => new Response('', { status: 200 })) as never

import OnboardingBusinessPage from './onboarding.business'

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

function output(overrides: Partial<BusinessVerification> = {}): BusinessVerification {
  return {
    verificationId: 'v1',
    status: 'DRAFT',
    businessType: 'COMPANY',
    document: '04252011000110',
    tradeName: 'Barbearia Teste',
    legalName: null,
    responsibleName: null,
    // COMPANY sempre persiste o CPF do responsável (obrigatório no backend);
    // INDIVIDUAL deriva do próprio documento — o default cobre ambos.
    responsibleCpf: '11144477735',
    categoryId: 'cat_1',
    phone: null,
    timezone: null,
    attendanceType: null,
    address: null,
    latitude: null,
    longitude: null,
    attemptCount: 0,
    maxAttempts: 3,
    canResubmit: true,
    requiredDocumentTypes: ['COMPROVANTE_CNPJ'],
    submittedDocumentTypes: [],
    missingDocumentTypes: ['COMPROVANTE_CNPJ'],
    submittedAt: null,
    decidedAt: null,
    expiresAt: null,
    rejectionReason: null,
    rejectionComment: null,
    approvedBusinessId: null,
    ...overrides,
  }
}



const EMPTY_OUTPUT = output({
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

/** Estado server-side simulado: as escritas mudam o que o GET devolve. */
let serverState: BusinessVerification = EMPTY_OUTPUT

/** Sessão que `sessionApi.getSession` devolve ao D8 (leitura crua de rede). */
function sessionFixture(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'u_new' },
    availableModes: ['OWNER', 'CUSTOMER'] as string[],
    businesses: [] as { id: string }[],
    customerProfile: { id: 'u_new' },
    isPlatformAdmin: false,
    preferences: { activeMode: null as string | null, activeBusinessId: null as string | null },
    ...overrides,
  }
}
let sessionState = sessionFixture()

function httpError(status: number, message?: string) {
  return new AxiosError(message ?? 'erro', String(status), undefined, undefined, {
    status,
    data: message ? { message } : {},
    statusText: '',
    headers: {},
    config: {} as never,
  })
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="path">{loc.pathname}</div>
}

function mount(initial = EMPTY_OUTPUT) {
  serverState = initial
  // O GET reflete o estado do servidor: depois de create/submit, a próxima
  // invalidação devolve a solicitação nova, como no backend real.
  getMy.mockImplementation(async () => serverState)
  create.mockImplementation(async (payload: Record<string, unknown>) => {
    // Validação de domínio espelhada do backend (deriveResponsibleCpf): COMPANY
    // exige CPF do responsável — foi assim que o P-1 escapou dos testes
    // hipotéticos que não validavam o domínio aqui.
    if (
      payload.businessType === 'COMPANY' &&
      String(payload.responsibleCpf ?? '').replace(/\D/g, '').length !== 11
    ) {
      throw httpError(400, 'CPF do responsável é obrigatório para pessoa jurídica.')
    }
    serverState = output({
      status: 'DRAFT',
      businessType: payload.businessType as BusinessVerification['businessType'],
      document: payload.document as string,
      tradeName: payload.tradeName as string,
      categoryId: payload.categoryId as string,
      legalName: (payload.legalName as string) ?? null,
      responsibleName: (payload.responsibleName as string) ?? null,
      responsibleCpf: (payload.responsibleCpf as string) ?? null,
      phone: (payload.phone as string) ?? null,
      requiredDocumentTypes:
        payload.businessType === 'COMPANY' ? ['COMPROVANTE_CNPJ'] : ['CPF_FRENTE', 'CPF_VERSO'],
      missingDocumentTypes:
        payload.businessType === 'COMPANY' ? ['COMPROVANTE_CNPJ'] : ['CPF_FRENTE', 'CPF_VERSO'],
    })
    return serverState
  })
  update.mockImplementation(async (payload: Record<string, unknown>) => {
    serverState = { ...serverState, ...(payload as Partial<BusinessVerification>), status: 'DRAFT' }
    return serverState
  })
  submit.mockImplementation(async () => {
    serverState = { ...serverState, status: 'PENDING', missingDocumentTypes: [], submittedAt: new Date().toISOString() }
    return serverState
  })
  cancel.mockImplementation(async () => {
    serverState = { ...serverState, status: 'CANCELLED' }
    return serverState
  })
  completeDocument.mockImplementation(async (payload: { documentType: BusinessVerificationDocumentType }) => {
    const submitted = [...new Set([...serverState.submittedDocumentTypes, payload.documentType])]
    const required = serverState.requiredDocumentTypes
    serverState = {
      ...serverState,
      submittedDocumentTypes: submitted,
      missingDocumentTypes: required.filter((t) => !submitted.includes(t)),
    }
    return { documentId: `doc_${payload.documentType}`, version: 1 }
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OnboardingBusinessPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { qc }
}

function pdfFile(name = 'comprovante.pdf') {
  return new File([new Uint8Array(12)], name, { type: 'application/pdf' })
}

async function fillCompanyForm({ skipResponsibleCpf = false } = {}) {
  fireEvent.click(screen.getByTestId('pick-cnpj'))
  fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '04.252.011/0001-10' } })
  fireEvent.change(screen.getByLabelText('Nome fantasia'), { target: { value: 'Barbearia Teste' } })
  if (!skipResponsibleCpf) {
    fireEvent.change(screen.getByLabelText('CPF do responsável'), {
      target: { value: '111.444.777-35' },
    })
  }
  const select = await screen.findByLabelText('Categoria')
  await waitFor(() => expect(screen.getByRole('option', { name: 'Barbearia' })).toBeTruthy())
  fireEvent.change(select, { target: { value: 'cat_1' } })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  sessionState = sessionFixture()
  uiSession = {
    user: { id: 'u_new' },
    availableModes: ['CUSTOMER'],
    businesses: [],
    customerProfile: { id: 'u_new' },
    isPlatformAdmin: false,
    preferences: { activeMode: null, activeBusinessId: null },
  }
  ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Response('', { status: 200 }),
  )
})

afterEach(() => cleanup())

/* ------------------------------------------------------------------ */
/* O-01 / O-02 / O-16                                                  */
/* ------------------------------------------------------------------ */

describe('O-01/O-02/O-16 — DRAFT', () => {
  it('O-01: sem verificação, a tela abre o seletor de tipo e cria o DRAFT', async () => {
    const created = output({ status: 'DRAFT' })
    create.mockResolvedValue(created)
    mount(EMPTY_OUTPUT)

    await waitFor(() => expect(screen.getByText('Como seu negócio está registrado?')).toBeTruthy())

    await fillCompanyForm()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitação' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    // O DTO exige dígitos crus; a máscara é apresentação.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessType: 'COMPANY',
        document: '04252011000110',
        tradeName: 'Barbearia Teste',
        categoryId: 'cat_1',
      }),
    )
    // Nenhum campo de endereço: não existe mais no contrato de criação.
    expect(create.mock.calls[0][0]).not.toHaveProperty('address')
    // COMPANY exige CPF do responsável (deriveResponsibleCpf no backend) —
    // enviado em dígitos crus, sem a máscara de apresentação.
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ responsibleCpf: '11144477735' }))
  })

  it('P-1: COMPANY sem CPF do responsável é barrado pela validação local (API intacta)', async () => {
    mount(EMPTY_OUTPUT)
    await waitFor(() => expect(screen.getByText('Como seu negócio está registrado?')).toBeTruthy())

    await fillCompanyForm({ skipResponsibleCpf: true })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitação' }))

    await waitFor(() =>
      expect(screen.getByText('Informe o CPF do responsável (11 dígitos)')).toBeTruthy(),
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('O-02: DRAFT existente é preservado — a edição usa PATCH, nunca POST', async () => {
    const draft = output()
    getMy.mockResolvedValue(draft)
    update.mockResolvedValue(draft)
    mount(draft)

    await waitFor(() => expect(screen.getByLabelText('Nome fantasia')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Nome fantasia'), { target: { value: 'Novo Nome' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(create).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ tradeName: 'Novo Nome' }))
  })

  it('O-02: o DRAFT existente é hidratado com os dados do servidor', async () => {
    mount(output({ businessType: 'INDIVIDUAL', document: '52998224725', tradeName: 'Autônomo' }))

    await waitFor(() => expect(screen.getByLabelText('CPF')).toBeTruthy())
    expect((screen.getByLabelText('Nome fantasia') as HTMLInputElement).value).toBe('Autônomo')
    expect((screen.getByLabelText('CPF') as HTMLInputElement).value).toBe('529.982.247-25')
  })

  it('O-16: o onboarding nunca chama POST /businesses', async () => {
    create.mockResolvedValue(output())
    mount(EMPTY_OUTPUT)
    await waitFor(() => expect(screen.getByTestId('pick-cnpj')).toBeTruthy())
    await fillCompanyForm()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitação' }))
    await waitFor(() => expect(create).toHaveBeenCalled())

    // O mock lança se chamado: chegar aqui prova que ele não foi chamado.
    expect(legacyCreateBusiness).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/* O-03 / O-04 / O-05 — documentos por tipo                            */
/* ------------------------------------------------------------------ */

describe('O-03/O-04/O-05 — documentos exigidos por tipo', () => {
  it('O-03: CPF exige frente e verso', async () => {
    mount(
      output({
        businessType: 'INDIVIDUAL',
        document: '52998224725',
        requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
        missingDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      }),
    )

    await waitFor(() => expect(screen.getByTestId('file-CPF_FRENTE')).toBeTruthy())
    expect(screen.getByTestId('doc-label-CPF_FRENTE').textContent).toContain('obrigatório')
    expect(screen.getByTestId('doc-label-CPF_VERSO').textContent).toContain('obrigatório')
    // Faltando um dos dois, o submit não habilita.
    expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('O-04: CPF selfie é opcional', async () => {
    mount(
      output({
        businessType: 'INDIVIDUAL',
        document: '52998224725',
        requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
        missingDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      }),
    )

    await waitFor(() => expect(screen.getByTestId('file-CPF_SELFIE')).toBeTruthy())
    expect(screen.getByTestId('doc-label-CPF_SELFIE').textContent).toContain('opcional')
  })

  it('O-04: frente + verso enviados, sem selfie, já habilitam o submit', async () => {
    mount(
      output({
        businessType: 'INDIVIDUAL',
        submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
        missingDocumentTypes: [],
        requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
  })

  it('O-05: CNPJ exige comprovante e não pede documentos de CPF', async () => {
    mount(output({ requiredDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: ['COMPROVANTE_CNPJ'] }))

    await waitFor(() => expect(screen.getByTestId('file-COMPROVANTE_CNPJ')).toBeTruthy())
    expect(screen.getByTestId('doc-label-COMPROVANTE_CNPJ').textContent).toContain('obrigatório')
    expect(screen.queryByTestId('file-CPF_FRENTE')).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* O-06 / O-14 — pipeline de documento                                 */
/* ------------------------------------------------------------------ */

describe('O-06/O-14 — presign, upload e complete', () => {
  async function startCompanyDraft() {
    mount(EMPTY_OUTPUT)
    await waitFor(() => expect(screen.getByTestId('pick-cnpj')).toBeTruthy())
    await fillCompanyForm()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitação' }))
    // O DRAFT criado abre os campos de documento.
    await waitFor(() => expect(screen.getByTestId('file-COMPROVANTE_CNPJ')).toBeTruthy())
  }

  it('O-06: enviar um arquivo percorre presign, PUT na signed URL e complete', async () => {
    presignDocument.mockResolvedValue({
      documentType: 'COMPROVANTE_CNPJ',
      url: 'https://signed.example/u?token=t',
      storageKey: 'documents/v1/COMPROVANTE_CNPJ/uuid.pdf',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      maxSizeBytes: 15 * 1024 * 1024,
      allowedContentTypes: ['application/pdf', 'image/jpeg'],
    })
    await startCompanyDraft()

    fireEvent.change(screen.getByTestId('file-COMPROVANTE_CNPJ'), { target: { files: [pdfFile()] } })

    await waitFor(() => expect(completeDocument).toHaveBeenCalledTimes(1))
    expect(presignDocument).toHaveBeenCalledWith({
      documentType: 'COMPROVANTE_CNPJ',
      contentType: 'application/pdf',
    })
    expect(globalThis.fetch).toHaveBeenCalledWith('https://signed.example/u?token=t', expect.anything())
    // complete leva SOMENTE os três campos do DTO.
    expect(completeDocument).toHaveBeenCalledWith({
      documentType: 'COMPROVANTE_CNPJ',
      storageKey: 'documents/v1/COMPROVANTE_CNPJ/uuid.pdf',
      sha256: 'b'.repeat(64),
    })
    await waitFor(() =>
      expect(screen.getByTestId('doc-state-COMPROVANTE_CNPJ').textContent).toContain('Concluído'),
    )
  })

  it('O-14: falha no upload mostra o erro sem mascarar como sucesso', async () => {
    presignDocument.mockResolvedValue({
      documentType: 'COMPROVANTE_CNPJ',
      url: 'https://signed.example/u',
      storageKey: 'k',
      expiresAt: new Date().toISOString(),
      maxSizeBytes: 15 * 1024 * 1024,
      allowedContentTypes: ['application/pdf'],
    })
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response('', { status: 403 }),
    )
    await startCompanyDraft()

    fireEvent.change(screen.getByTestId('file-COMPROVANTE_CNPJ'), { target: { files: [pdfFile()] } })

    await waitFor(() =>
      expect(screen.getByTestId('doc-error-COMPROVANTE_CNPJ').textContent).toContain('403'),
    )
    expect(completeDocument).not.toHaveBeenCalled()
    expect(screen.getByTestId('doc-state-COMPROVANTE_CNPJ').textContent).toContain('Erro')
  })

  it('O-14: falha no presign exibe a mensagem do status', async () => {
    presignDocument.mockRejectedValue(httpError(422, 'Documento não permitido para este tipo.'))
    await startCompanyDraft()

    fireEvent.change(screen.getByTestId('file-COMPROVANTE_CNPJ'), { target: { files: [pdfFile()] } })

    await waitFor(() =>
      expect(screen.getByTestId('doc-error-COMPROVANTE_CNPJ').textContent).toBe(
        'Documento não permitido para este tipo.',
      ),
    )
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

/* ------------------------------------------------------------------ */
/* O-07 / O-08 / O-15 — submit e PENDING                               */
/* ------------------------------------------------------------------ */

describe('O-07/O-08/O-15 — submit', () => {
  it('O-07: submit leva o DRAFT a PENDING e mostra a tela de análise', async () => {
    const ready = output({ submittedDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: [] })
    mount(ready)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submeter para análise' }))

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    // O-08: a UI de análise assume a tela.
    await waitFor(() =>
      expect(screen.getByTestId('path').textContent).toBe('/onboarding/business-verification'),
    )
  })

  it('O-15: erro de submit é exibido com o motivo do backend', async () => {
    submit.mockRejectedValueOnce(httpError(409, 'Não há solicitação em andamento.'))
    mount(output({ submittedDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: [] }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submeter para análise' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Não há solicitação em andamento.'),
    )
    // Permanece na tela de edição: o erro não navega nem some.
    expect(screen.getByTestId('path').textContent).toBe('/')
  })

  it('O-15: erro 500 em submit não vira mensagem genérica vazia', async () => {
    submit.mockRejectedValueOnce(httpError(500))
    mount(output({ submittedDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: [] }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submeter para análise' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('erro 500'))
  })
})

/* ------------------------------------------------------------------ */
/* O-09 / O-10 — aprovação e D8                                        */
/* ------------------------------------------------------------------ */

describe('O-09/O-10 — APPROVED', () => {
  it('O-09/O-10: APPROVED refaz a sessão e aciona o D8 (sem usar businesses[0])', async () => {
    const approved = output({
      status: 'APPROVED',
      missingDocumentTypes: [],
      submittedDocumentTypes: ['COMPROVANTE_CNPJ'],
      approvedBusinessId: 'biz_approved',
    })
    // V-5: o alvo precisa existir no catálogo da sessão lida por rede.
    sessionState = sessionFixture({ businesses: [{ id: 'biz_approved' }] })
    patchPreferences.mockResolvedValue(undefined)
    mount(approved)

    // O D8 é o hook existente: relê a verificação E a sessão, e escreve a
    // preferência com o `approvedBusinessId` — nunca com businesses[0].
    await waitFor(() => expect(patchPreferences).toHaveBeenCalled(), { timeout: 3000 })
    expect(patchPreferences).toHaveBeenCalledWith({
      activeMode: 'OWNER',
      activeBusinessId: 'biz_approved',
    })
    await waitFor(() => expect(refreshSession).toHaveBeenCalled(), { timeout: 3000 })
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'), {
      timeout: 3000,
    })
  })
})

/* ------------------------------------------------------------------ */
/* O-11..O-13 — estados de encerramento                                */
/* ------------------------------------------------------------------ */

describe('O-11/O-12/O-13 — estados de encerramento', () => {
  it("O-08: PENDING encaminha para a rota de acompanhamento", async () => {
    mount(output({ status: 'PENDING', missingDocumentTypes: [] }))
    await waitFor(() =>
      expect(screen.getByTestId('path').textContent).toBe('/onboarding/business-verification'),
    )
  })

  it('O-11: REJECTED encaminha para o acompanhamento (reabertura é via request-resend da plataforma)', async () => {
    mount(
      output({
        status: 'REJECTED',
        attemptCount: 1,
        canResubmit: true,
        rejectionReason: 'DOCUMENT_ILLEGIBLE',
        missingDocumentTypes: ['COMPROVANTE_CNPJ'],
      }),
    )
    // P-2 refinado pela paridade com o backend: a write-path (`findOpenByOwner`)
    // só enxerga DRAFT/PENDING, então REJECTED não é editável pelo titular —
    // a reabertura ocorre no admin. Redirecionar para o acompanhamento evita o
    // bounce; quando a plataforma reabrir, o status volta a DRAFT e o formulário
    // fica acessível de novo.
    await waitFor(() =>
      expect(screen.getByTestId('path').textContent).toBe('/onboarding/business-verification'),
    )
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('P-3: dono de negócio NÃO é expulso do onboarding — pode abrir nova verificação', async () => {
    uiSession = {
      ...uiSession,
      availableModes: ['OWNER', 'CUSTOMER'],
      businesses: [{ id: 'biz_existente' }],
    }
    mount(EMPTY_OUTPUT)
    // Antes: `alreadyHasBusiness` mandava para /dashboard. Agora a tela abre
    // para cadastrar mais um negócio (a criação direta morreu com o 410).
    await waitFor(() =>
      expect(screen.getByText('Como seu negócio está registrado?')).toBeTruthy(),
    )
    expect(screen.getByTestId('path').textContent).not.toBe('/dashboard')
  })

  it.each<[string]>([['EXPIRED'], ['CANCELLED']])(
    'O-12/O-13: %s abre NOVA solicitação (create, nunca update)',
    async (status) => {
      mount(output({ status: status as BusinessVerification['status'] }))
      await waitFor(() => expect(screen.getByLabelText('Nome fantasia')).toBeTruthy())
      expect(screen.getByTestId('path').textContent).not.toBe('/onboarding/business-verification')

      fireEvent.click(screen.getByRole('button', { name: 'Abrir solicitação' }))
      await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
      expect(update).not.toHaveBeenCalled()
    },
  )
})

/* ------------------------------------------------------------------ */
/* Concorrência e idempotência                                         */
/* ------------------------------------------------------------------ */

describe('duplo envio e upload em andamento', () => {
  it('o botão de submit fica desabilitado enquanto um upload está em andamento', async () => {
    // DRAFT já com todos os documentos: submit habilitado em repouso.
    mount(output({ submittedDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: [] }))
    presignDocument.mockResolvedValue({
      documentType: 'COMPROVANTE_CNPJ',
      url: 'https://signed.example/u',
      storageKey: 'k',
      expiresAt: new Date().toISOString(),
      maxSizeBytes: 15 * 1024 * 1024,
      allowedContentTypes: ['application/pdf'],
    })
    // PUT pendente: o documento ainda não foi validado pelo backend.
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => undefined),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    fireEvent.change(screen.getByTestId('file-COMPROVANTE_CNPJ'), { target: { files: [pdfFile()] } })

    await waitFor(() =>
      expect(screen.getByTestId('doc-state-COMPROVANTE_CNPJ').textContent).toContain('Enviando'),
    )
    // Não é possível submeter antes de o complete confirmar o documento.
    expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('o botão de submit não dispara duas chamadas em cliques repetidos', async () => {
    mount(output({ submittedDocumentTypes: ['COMPROVANTE_CNPJ'], missingDocumentTypes: [] }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submeter para análise' })).toHaveProperty(
        'disabled',
        false,
      ),
    )
    const button = screen.getByRole('button', { name: 'Submeter para análise' })
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  })
})
