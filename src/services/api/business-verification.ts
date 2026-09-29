import { apiClient } from '@/lib/axios/client'
import type {
  BusinessVerification,
  BusinessVerificationAttendanceType,
  BusinessVerificationBusinessType,
  BusinessVerificationDocumentType,
  CompleteDocumentResult,
  PresignOutput,
} from '@/types/business-verification'

export interface CreateVerificationPayload {
  businessType: BusinessVerificationBusinessType
  document: string
  tradeName: string
  categoryId: string
  legalName?: string
  responsibleName?: string
  responsibleCpf?: string
  phone?: string
  timezone?: string
  attendanceType?: BusinessVerificationAttendanceType
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
}

export type UpdateVerificationPayload = Partial<CreateVerificationPayload>

/** `forbidNonWhitelisted` no backend rejeita campos fora do DTO com 400. */
export interface CompleteDocumentPayload {
  documentType: BusinessVerificationDocumentType
  storageKey: string
  /** O backend recalcula e compara; divergir é 409 (objeto trocado). */
  sha256: string
}

/* MODELO B — a criação do negócio é o ÚNICO caminho: a aprovação no servidor.
 * O cliente nunca envia `businessId`; `approvedBusinessId` é derivado no servidor. */

export const businessVerificationApi = {
  /** GET /me/business-verification — leitura da solicitação do titular. */
  getMy: async (): Promise<BusinessVerification> => {
    const { data } = await apiClient.get<BusinessVerification>('me/business-verification')
    return data
  },

  /** POST /me/business-verification — abre a solicitação em DRAFT. */
  create: async (payload: CreateVerificationPayload): Promise<BusinessVerification> => {
    const { data } = await apiClient.post<BusinessVerification>('me/business-verification', payload)
    return data
  },

  /** PATCH /me/business-verification — edita a solicitação aberta. */
  update: async (payload: UpdateVerificationPayload): Promise<BusinessVerification> => {
    const { data } = await apiClient.patch<BusinessVerification>('me/business-verification', payload)
    return data
  },

  /** POST /me/business-verification/submit — DRAFT/REJECTED → PENDING. */
  submit: async (): Promise<BusinessVerification> => {
    const { data } = await apiClient.post<BusinessVerification>('me/business-verification/submit')
    return data
  },

  /** POST /me/business-verification/cancel — cancela a solicitação. */
  cancel: async (): Promise<BusinessVerification> => {
    const { data } = await apiClient.post<BusinessVerification>('me/business-verification/cancel')
    return data
  },

  /**
   * POST /me/business-verification/documents/presign — signed URL de 60s.
   * Não grava documento; a chave do objeto vem no corpo porque não é
   * derivável da URL assinada.
   */
  presignDocument: async (payload: {
    documentType: BusinessVerificationDocumentType
    contentType: string
  }): Promise<PresignOutput> => {
    const { data } = await apiClient.post<PresignOutput>(
      'me/business-verification/documents/presign',
      payload,
    )
    return data
  },

  /** POST /me/business-verification/documents/complete — valida e versiona.
   *
   * O DTO aceita SOMENTE estes três campos: tamanho e tipo são lidos do próprio
   * objeto no storage, e enviá-los aqui seria 400 (`forbidNonWhitelisted`). */
  completeDocument: async (payload: CompleteDocumentPayload): Promise<CompleteDocumentResult> => {
    const { data } = await apiClient.post<CompleteDocumentResult>(
      'me/business-verification/documents/complete',
      payload,
    )
    return data
  },
}
