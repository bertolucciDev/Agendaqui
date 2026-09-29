import { describe, it, expect } from 'vitest'
import { evaluateD8 } from '../evaluate-d8'
import type { MeSession } from '@/types/session'
import type { BusinessVerification } from '@/types/business-verification'

/* V-1..V-5 — a ordem de avaliação é parte do contrato: V-4 (escolha manual) vem
 * antes de qualquer checagem de recurso, para ser o primeiro desfecho possível. */

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

function session(overrides: Partial<MeSession['preferences']> = {}, businesses = ['bus_1']): MeSession {
  return {
    user: { id: 'u_1' },
    availableModes: ['OWNER', 'CUSTOMER'],
    businesses: businesses.map((id) => ({ id, name: id, memberships: [] })),
    customerProfile: null,
    isPlatformAdmin: false,
    preferences: { activeMode: null, activeBusinessId: null, ...overrides },
  }
}

const base = {
  watchedVerificationId: 'verif_1',
  targetBusinessId: 'bus_1',
  verification: APPROVED,
  session: session(),
}

describe('evaluateD8', () => {
  it('escreve quando todas as condições passam', () => {
    expect(evaluateD8(base)).toEqual({ outcome: 'write' })
  })

  it('V-1 reprova quando a solicitação observada não é a do gatilho', () => {
    const decision = evaluateD8({ ...base, verification: { ...APPROVED, verificationId: 'verif_2' } })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'VERIFICATION_CHANGED' })
  })

  it('V-2 reprova sem aprovação', () => {
    const decision = evaluateD8({ ...base, verification: { ...APPROVED, status: 'PENDING' } })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'NOT_APPROVED' })
  })

  it('V-3 reprova quando o aprovado é outro negócio', () => {
    const decision = evaluateD8({
      ...base,
      verification: { ...APPROVED, approvedBusinessId: 'bus_9' },
    })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'DIFFERENT_APPROVED_BUSINESS' })
  })

  it('V-4 preserva escolha manual de outro negócio', () => {
    const decision = evaluateD8({ ...base, session: session({ activeBusinessId: 'bus_2' }) })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'MANUAL_CHOICE_PRESERVED' })
  })

  it('V-4 com o próprio id conclui D8 sem escrever', () => {
    const decision = evaluateD8({ ...base, session: session({ activeBusinessId: 'bus_1' }) })
    expect(decision).toEqual({ outcome: 'completed' })
  })

  it('V-5 reprova quando o alvo saiu do catálogo', () => {
    const decision = evaluateD8({ ...base, session: session({}, []) })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'BUSINESS_NOT_IN_CATALOG' })
  })

  it('V-4 é avaliado antes de V-5 (corte curto na escolha manual)', () => {
    // Sem negócio no catálogo E com escolha manual: o motivo é a escolha manual,
    // porque V-4 vem antes na ordem.
    const decision = evaluateD8({
      ...base,
      session: session({ activeBusinessId: 'bus_2' }, []),
    })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'MANUAL_CHOICE_PRESERVED' })
  })

  it('V-3 é avaliado antes de V-4', () => {
    const decision = evaluateD8({
      ...base,
      verification: { ...APPROVED, approvedBusinessId: 'bus_9' },
      session: session({ activeBusinessId: 'bus_2' }),
    })
    expect(decision).toEqual({ outcome: 'skipped', reason: 'DIFFERENT_APPROVED_BUSINESS' })
  })
})
