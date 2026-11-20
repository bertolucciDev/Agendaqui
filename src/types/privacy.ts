export type PrivacyRequestType =
  | 'ACCESS'
  | 'CORRECTION'
  | 'DELETION'
  | 'PORTABILITY'
  | 'OPPOSITION'
  | 'INFORMATION'

export type PrivacyRequestStatus =
  | 'RECEIVED'
  | 'IN_REVIEW'
  | 'WAITING_FOR_INFORMATION'
  | 'FULFILLED'
  | 'PARTIALLY_FULFILLED'
  | 'DENIED'
  | 'CANCELLED'

export interface PrivacyRequestHistoryItem {
  fromStatus: PrivacyRequestStatus | null
  toStatus: PrivacyRequestStatus
  responseMessage: string | null
  userMessage: string | null
  createdAt: string
}

export interface PrivacyRequest {
  id: string
  userId: string
  type: PrivacyRequestType
  status: PrivacyRequestStatus
  createdAt: string
  updatedAt: string
  closedAt: string | null
  history: PrivacyRequestHistoryItem[]
}

export interface AdminPrivacyRequest extends PrivacyRequest {
  user: { id: string; name: string; email: string }
}

export interface AdminPrivacyRequestList {
  items: AdminPrivacyRequest[]
  total: number
}

export interface PrivacyExportDocument {
  id: string
  documentType: string
  version: number
  status: string
  mimeType: string
  sizeBytes: number
  sha256: string
  createdAt: string
  downloadPath: string
}

export interface PrivacyDataExport {
  generatedAt: string
  excludedCredentialData: string[]
  account: Record<string, unknown>
  customerProfile: Record<string, unknown> | null
  adminProfile: Record<string, unknown> | null
  preferences: Record<string, unknown> | null
  activeSessions: { deviceInfo?: string; createdAt: string; expiresAt: string }[]
  ownedBusinesses: Record<string, unknown>[]
  professionalMemberships: Record<string, unknown>[]
  appointmentsAsCustomer: Record<string, unknown>[]
  appointmentsAsProfessional: Record<string, unknown>[]
  businessVerifications: Record<string, unknown>[]
  documents: PrivacyExportDocument[]
  invitationsReceived: Record<string, unknown>[]
  verificationHistory: Record<string, unknown>[]
  privacyRequests: Record<string, unknown>[]
  securityAuditEvents: Record<string, unknown>[]
}
