import { describe, it, expect } from 'vitest'
import { canEdit, canSubmit, canUploadDocuments, isClosed, isEmpty } from '../permissions'
import { documentTypesFor, isDocumentRequired, isDocumentSubmitted, DOCUMENT_LABELS, REJECTION_LABELS } from '../document-rules'
import type { BusinessVerification, BusinessVerificationDocumentType } from '@/types/business-verification'

/**
 * As regras de exibição do onboarding, derivadas do CONTRATO do backend.
 *
 * Obligatoriedade de documento NÃO é decidida aqui: vem de
 * `requiredDocumentTypes`/`missingDocumentTypes` (O-03/O-04/O-05).
 */

function verification(overrides: Partial<BusinessVerification> = {}): BusinessVerification {
  return {
    verificationId: 'v1',
    status: 'DRAFT',
    businessType: 'INDIVIDUAL',
    document: '52998224725',
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
    attemptCount: 0,
    maxAttempts: 3,
    canResubmit: true,
    requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
    submittedDocumentTypes: [],
    missingDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
    submittedAt: null,
    decidedAt: null,
    expiresAt: null,
    rejectionReason: null,
    rejectionComment: null,
    approvedBusinessId: null,
    ...overrides,
  }
}

describe('permissions derivadas do contrato', () => {
  it('só DRAFT é editável (backend: findOpenByOwner só aceita DRAFT/PENDING)', () => {
    expect(canEdit('DRAFT')).toBe(true)
    expect(canEdit('REJECTED')).toBe(false)
    expect(canEdit('PENDING')).toBe(false)
    expect(canEdit('APPROVED')).toBe(false)
    expect(canEdit('EXPIRED')).toBe(false)
    expect(canEdit('CANCELLED')).toBe(false)
    expect(canEdit(null)).toBe(false)
  })

  it('upload de documento só é permitido nos mesmos estados editáveis', () => {
    expect(canUploadDocuments('DRAFT')).toBe(true)
    expect(canUploadDocuments('REJECTED')).toBe(false)
    expect(canUploadDocuments('PENDING')).toBe(false)
  })

  it('não existe verificação quando verificationId é null (output vazio do backend)', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(verification({ verificationId: null }))).toBe(true)
    expect(isEmpty(verification())).toBe(false)
  })

  it('PENDING, APPROVED, EXPIRED e CANCELLED são estados fechados', () => {
    expect(isClosed('PENDING')).toBe(true)
    expect(isClosed('APPROVED')).toBe(true)
    expect(isClosed('DRAFT')).toBe(false)
    expect(isClosed('REJECTED')).toBe(false)
  })

  it('O-07: submit só habilita com zero documentos faltando', () => {
    expect(canSubmit(verification())).toBe(false)
    expect(
      canSubmit(
        verification({ submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'], missingDocumentTypes: [] }),
      ),
    ).toBe(true)
  })

  it('O-03: CPF selfie não é exigida — o submit habilita com frente + verso', () => {
    const v = verification({
      requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      missingDocumentTypes: [],
    })
    expect(isDocumentRequired(v, 'CPF_SELFIE')).toBe(false)
    expect(isDocumentRequired(v, 'CPF_FRENTE')).toBe(true)
    expect(canSubmit(v)).toBe(true)
  })

  it('O-03: falta a frente OU o verso, o submit continua bloqueado', () => {
    const base = {
      requiredDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'] as BusinessVerificationDocumentType[],
    }
    expect(
      canSubmit(
        verification({
          ...base,
          submittedDocumentTypes: ['CPF_FRENTE'],
          missingDocumentTypes: ['CPF_VERSO'],
        }),
      ),
    ).toBe(false)
    expect(
      canSubmit(
        verification({
          ...base,
          submittedDocumentTypes: ['CPF_VERSO'],
          missingDocumentTypes: ['CPF_FRENTE'],
        }),
      ),
    ).toBe(false)
  })

  it('O-11: REJECTED na terceira tentativa não pode mais submeter (canResubmit do backend)', () => {
    expect(
      canSubmit(
        verification({
          status: 'REJECTED',
          attemptCount: 3,
          maxAttempts: 3,
          canResubmit: false,
          submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
          missingDocumentTypes: [],
        }),
      ),
    ).toBe(false)
  })

  it('O-08: PENDING não é editável nem submissível, mesmo com tudo enviado', () => {
    const v = verification({
      status: 'PENDING',
      submittedDocumentTypes: ['CPF_FRENTE', 'CPF_VERSO'],
      missingDocumentTypes: [],
    })
    expect(canEdit('PENDING')).toBe(false)
    expect(canSubmit(v)).toBe(false)
  })

  it('sem verificação não há submit', () => {
    expect(canSubmit(null)).toBe(false)
  })
})

describe('documentTypesFor', () => {
  it('O-05: CNPJ pede somente o comprovante', () => {
    expect(documentTypesFor('COMPANY')).toEqual(['COMPROVANTE_CNPJ'])
  })

  it('CPF oferece frente, verso e selfie', () => {
    expect(documentTypesFor('INDIVIDUAL')).toEqual(['CPF_FRENTE', 'CPF_VERSO', 'CPF_SELFIE'])
  })

  it('sem businessType definido, nenhum documento é oferecido', () => {
    expect(documentTypesFor(null)).toEqual([])
  })
})

describe('labels', () => {
  it('todo tipo de documento tem rótulo em português', () => {
    const types: BusinessVerificationDocumentType[] = [
      'CPF_FRENTE',
      'CPF_VERSO',
      'CPF_SELFIE',
      'COMPROVANTE_CNPJ',
    ]
    for (const t of types) expect(DOCUMENT_LABELS[t]).toBeTruthy()
  })

  it('todo motivo de rejeição do backend tem rótulo legível', () => {
    for (const reason of [
      'DOCUMENT_ILLEGIBLE',
      'NOME_DIVERGENTE',
      'DOCUMENTO_VENCIDO',
      'RESPONSAVEL_INCOERENTE',
      'ARQUIVO_NAO_CORRESPONDE',
      'OUTRO',
    ]) {
      expect(REJECTION_LABELS[reason]).toBeTruthy()
    }
  })

  it('isDocumentSubmitted reflete submittedDocumentTypes do contrato', () => {
    const v = verification({ submittedDocumentTypes: ['CPF_FRENTE'] })
    expect(isDocumentSubmitted(v, 'CPF_FRENTE')).toBe(true)
    expect(isDocumentSubmitted(v, 'CPF_VERSO')).toBe(false)
  })
})
