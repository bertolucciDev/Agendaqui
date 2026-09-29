/* Contrato de GET /me/business-verification e dos comandos de solicitação.
 * Espelha `application/types/verification.contract.ts` do backend
 * (BusinessVerificationOutput / PresignOutput / DocumentOutput). */

export type BusinessVerificationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'

export type BusinessVerificationBusinessType = 'INDIVIDUAL' | 'COMPANY'

export type BusinessVerificationDocumentType =
  | 'CPF_FRENTE'
  | 'CPF_VERSO'
  | 'CPF_SELFIE'
  | 'COMPROVANTE_CNPJ'

export type RejectionReason =
  | 'DOCUMENT_ILLEGIBLE'
  | 'NOME_DIVERGENTE'
  | 'DOCUMENTO_VENCIDO'
  | 'RESPONSAVEL_INCOERENTE'
  | 'ARQUIVO_NAO_CORRESPONDE'
  | 'OUTRO'

/** `attendanceType` espelha `ATTENDANCE_TYPES` do backend. */
export type BusinessVerificationAttendanceType = 'AT_LOCATION' | 'AT_CUSTOMER' | 'BOTH'

export interface BusinessVerificationAddress {
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  country: string | null
}

export interface BusinessVerification {
  verificationId: string | null
  status: BusinessVerificationStatus | null
  businessType: BusinessVerificationBusinessType | null
  document: string | null
  tradeName: string | null
  legalName: string | null
  responsibleName: string | null
  responsibleCpf: string | null
  categoryId: string | null
  phone: string | null
  timezone: string | null
  attendanceType: BusinessVerificationAttendanceType | null
  address: BusinessVerificationAddress | null
  latitude: number | null
  longitude: number | null
  attemptCount: number
  maxAttempts: number
  canResubmit: boolean
  requiredDocumentTypes: BusinessVerificationDocumentType[]
  submittedDocumentTypes: BusinessVerificationDocumentType[]
  missingDocumentTypes: BusinessVerificationDocumentType[]
  submittedAt: string | null
  decidedAt: string | null
  expiresAt: string | null
  rejectionReason: RejectionReason | null
  rejectionComment: string | null
  /** Derivado no servidor por `Business.document`. Enquanto não aprovado, é `null`. */
  approvedBusinessId: string | null
}

export interface PresignOutput {
  documentType: BusinessVerificationDocumentType
  url: string
  storageKey: string
  expiresAt: string
  maxSizeBytes: number
  allowedContentTypes: string[]
}

export interface VerificationDocument {
  id: string
  documentType: BusinessVerificationDocumentType
  version: number
  status: 'ACTIVE' | 'SUPERSEDED' | 'REJECTED'
  sizeBytes: number
  mimeType: string
  createdAt: string
  contentUrl: string
}

/** Envelope de `complete` — o documento validado e versionado. */
export interface CompleteDocumentResult {
  documentId: string
  version: number
}
