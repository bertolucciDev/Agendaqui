import type {
  BusinessVerification,
  BusinessVerificationBusinessType,
  BusinessVerificationDocumentType,
} from '@/types/business-verification'

/**
 * Rótulos e frescuras de apresentação dos documentos.
 *
 * NENHUMA regra de obrigatoriedade é definida aqui: a lista canônica de
 * documentos obrigatórios e os faltantes vêm do backend, em
 * `requiredDocumentTypes` / `missingDocumentTypes`. O frontend apenas
 * apresenta. Isso respeita "não duplicar regras de negócio que pertencem ao
 * backend" da fatia 2.
 */

export const DOCUMENT_LABELS: Record<BusinessVerificationDocumentType, string> = {
  CPF_FRENTE: 'CPF — frente',
  CPF_VERSO: 'CPF — verso',
  CPF_SELFIE: 'CPF — selfie com o documento',
  COMPROVANTE_CNPJ: 'Comprovante de CNPJ',
}

export const DOCUMENT_HINTS: Record<BusinessVerificationDocumentType, string> = {
  CPF_FRENTE: 'Foto ou PDF do CPF, lado da foto.',
  CPF_VERSO: 'Foto ou PDF do CPF, lado do verso.',
  CPF_SELFIE: 'Opcional. Selfie segurando o CPF ao lado do rosto.',
  COMPROVANTE_CNPJ: 'Comprovante de inscrição no CNPJ.',
}

export const REJECTION_LABELS: Record<string, string> = {
  DOCUMENT_ILLEGIBLE: 'Documento ilegível',
  NOME_DIVERGENTE: 'Nome divergente',
  DOCUMENTO_VENCIDO: 'Documento vencido',
  RESPONSAVEL_INCOERENTE: 'Responsável incoerente',
  ARQUIVO_NAO_CORRESPONDE: 'Arquivo não corresponde',
  OUTRO: 'Outro motivo',
}

/**
 * Documentos que a tela deve oferecer, na ordem em que o backend os lista.
 * `requiredDocumentTypes` é a fonte de verdade; o fallback cobre o instante
 * anterior ao primeiro carregamento, usando o mesmo conjunto do domínio.
 */
export function documentTypesFor(businessType: BusinessVerificationBusinessType | null): BusinessVerificationDocumentType[] {
  if (businessType === 'INDIVIDUAL') return ['CPF_FRENTE', 'CPF_VERSO', 'CPF_SELFIE']
  if (businessType === 'COMPANY') return ['COMPROVANTE_CNPJ']
  return []
}

export function isDocumentRequired(
  verification: Pick<BusinessVerification, 'requiredDocumentTypes'>,
  documentType: BusinessVerificationDocumentType,
): boolean {
  return verification.requiredDocumentTypes.includes(documentType)
}

export function isDocumentMissing(
  verification: Pick<BusinessVerification, 'missingDocumentTypes'>,
  documentType: BusinessVerificationDocumentType,
): boolean {
  return verification.missingDocumentTypes.includes(documentType)
}

/* O contrato de `GET /me/business-verification` NÃO expõe a lista de
 * `documents` (só `submittedDocumentTypes`). A versão de um documento só é
 * observável via `requiredDocumentTypes`/`missingDocumentTypes`, e o
 * `DocumentOutput` completo fica no fluxo administrativo. */

/** Documento já aceito pelo servidor, segundo o contrato. */
export function isDocumentSubmitted(
  verification: Pick<BusinessVerification, 'submittedDocumentTypes'>,
  documentType: BusinessVerificationDocumentType,
): boolean {
  return verification.submittedDocumentTypes.includes(documentType)
}
