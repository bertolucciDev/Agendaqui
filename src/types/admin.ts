/* Tipos para endpoints admin da plataforma */

export type AdminLevel = 'SUPER_ADMIN' | 'ADMIN'

export interface AdminProfile {
  userId: string
  level: AdminLevel
}

export type VerificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
export type BusinessType = 'COMPANY' | 'INDIVIDUAL'
export type RejectionReason = 'DOCUMENT_ILLEGIBLE' | 'NOME_DIVERGENTE' | 'DOCUMENTO_VENCIDO' | 'RESPONSAVEL_INCOERENTE' | 'ARQUIVO_NAO_CORRESPONDE' | 'OUTRO'
export type AttendanceType = 'AT_LOCATION' | 'AT_CUSTOMER' | 'BOTH'

export interface AdminVerificationDocument {
  id: string
  documentType: 'CPF_FRENTE' | 'CPF_VERSO' | 'CPF_SELFIE' | 'COMPROVANTE_CNPJ'
  version: number
  status: 'ACTIVE' | 'SUPERSEDED' | 'REJECTED'
  sizeBytes: number
  mimeType: string
  createdAt: string
  contentUrl: string
}

export interface AdminVerificationSummary {
  verificationId: string
  ownerUserId: string
  ownerName: string
  status: VerificationStatus
  businessType: BusinessType
  document: string
  tradeName: string | null
  legalName: string | null
  categoryId: string | null
  attemptCount: number
  submittedAt: string | null
  expiresAt: string | null
  documents: AdminVerificationDocument[]
  approvedBusinessId: string | null
  rejectionReason: RejectionReason | null
  rejectionComment: string | null
}

export interface AdminVerificationListOutput {
  data: AdminVerificationSummary[]
  total: number
  limit: number
  offset: number
  items: AdminVerificationSummary[]
}

export interface RejectBusinessVerificationDto {
  reason: RejectionReason
  comment: string
}

export interface ApproveResult {
  verificationId: string
  businessId: string
  locationId: string
}

export interface RejectResult {
  verificationId: string
  status: 'REJECTED'
}

export interface ResendResult {
  verificationId: string
  status: 'DRAFT'
}

export interface BlockResult {
  businessId: string
  status: 'BLOCKED'
}

export interface UnblockResult {
  businessId: string
  status: 'ACTIVE'
}

export interface PlatformConfig {
  commissionRateBps: number
}

export interface UpdatePlatformConfigDto {
  commissionRateBps: number
}

/* ============================================================
   Admin — Business Management
   ============================================================ */

export type AdminBusinessStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED'

export interface AdminBusinessListItem {
  id: string
  name: string
  document: string
  status: AdminBusinessStatus
  type: 'COMPANY' | 'INDIVIDUAL'
  slug: string
  categoryId: string
  categoryName: string | null
  ownerName: string
  ownerEmail: string
  locationCount: number
  serviceCount: number
  createdAt: string
  updatedAt: string
  cancellationPolicyHours: number
  bookingWindowDays: number
  slotGranularityMinutes: number
  sellsProducts: boolean
}

export interface AdminBusinessDetail extends AdminBusinessListItem {
  description: string | null
  phone: string | null
  legalName: string | null
  responsibleName: string | null
  responsibleCpf: string | null
  locations: {
    id: string
    name: string
    address: string
    status: string
    attendanceType: string
    isHeadquarter: boolean
    timezone: string
  }[]
  services: {
    id: string
    name: string
    description: string | null
    priceCents: number
    durationMinutes: number
    active: boolean
  }[]
}

export interface AdminBusinessListOutput {
  data: AdminBusinessListItem[]
  total: number
  limit: number
  offset: number
}
