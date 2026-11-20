import { apiClient } from '@/lib/axios/client'
import type {
  AdminProfile,
  AdminVerificationListOutput,
  AdminVerificationSummary,
  ApproveResult,
  RejectResult,
  RejectBusinessVerificationDto,
  ResendResult,
  BlockResult,
  UnblockResult,
  PlatformConfig,
  UpdatePlatformConfigDto,
  AdminBusinessDetail,
  AdminBusinessListOutput,
} from '@/types/admin'

export const adminApi = {
  /** GET /me/admin-profile */
  getMyProfile: async (): Promise<AdminProfile> => {
    const { data } = await apiClient.get<AdminProfile>('me/admin-profile')
    return data
  },

  /** GET /me/admin/business-verifications */
  listVerifications: async (params?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<AdminVerificationListOutput> => {
    const { data } = await apiClient.get<AdminVerificationListOutput>('me/admin/business-verifications', { params })
    return data
  },

  /** GET /me/admin/business-verifications/:id */
  getVerification: async (id: string): Promise<AdminVerificationSummary> => {
    const { data } = await apiClient.get<AdminVerificationSummary>(`me/admin/business-verifications/${id}`)
    return data
  },

  /** GET /me/admin/business-verifications/:id/audit */
  getVerificationAudit: async (id: string): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>(`me/admin/business-verifications/${id}/audit`)
    return data
  },

  /**
   * Conteúdo do documento para revisão.
   *
   * Não pode ser um `<a href>`: a navegação do browser não carrega o header
   * `Authorization`, e o `contentUrl` do backend é um caminho RELATIVO — sem o
   * prefixo da API ele resolveria contra a origem do front (SPA) e cairia na
   * rota catch-all, que redireciona para a landing page.
   *
   * Buscar via axios resolve os dois pontos: o interceptor anexa o Bearer token
   * e o `baseURL` aponta para a API.
   */
  getDocumentContent: async (contentUrl: string, signal?: AbortSignal): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(contentUrl, {
      responseType: 'blob',
      signal,
    })
    return data
  },

  /** POST /me/admin/business-verifications/:id/approve */
  approveVerification: async (id: string): Promise<ApproveResult> => {
    const { data } = await apiClient.post<ApproveResult>(`me/admin/business-verifications/${id}/approve`)
    return data
  },

  /** POST /me/admin/business-verifications/:id/reject */
  rejectVerification: async (id: string, payload: RejectBusinessVerificationDto): Promise<RejectResult> => {
    const { data } = await apiClient.post<RejectResult>(`me/admin/business-verifications/${id}/reject`, payload)
    return data
  },

  /** POST /me/admin/business-verifications/:id/request-resend */
  requestResend: async (id: string): Promise<ResendResult> => {
    const { data } = await apiClient.post<ResendResult>(`me/admin/business-verifications/${id}/request-resend`)
    return data
  },

  /** POST /me/admin/business-verifications/:id/block */
  blockBusiness: async (id: string): Promise<BlockResult> => {
    const { data } = await apiClient.post<BlockResult>(`me/admin/business-verifications/${id}/block`)
    return data
  },

  /** POST /me/admin/business-verifications/:id/unblock */
  unblockBusiness: async (id: string): Promise<UnblockResult> => {
    const { data } = await apiClient.post<UnblockResult>(`me/admin/business-verifications/${id}/unblock`)
    return data
  },

  /** GET /platform-config */
  getPlatformConfig: async (): Promise<PlatformConfig> => {
    const { data } = await apiClient.get<PlatformConfig>('platform-config')
    return data
  },

  /** PUT /platform-config */
  updatePlatformConfig: async (payload: UpdatePlatformConfigDto): Promise<PlatformConfig> => {
    const { data } = await apiClient.put<PlatformConfig>('platform-config', payload)
    return data
  },

  /** GET /admin/businesses */
  listAllBusinesses: async (params?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<AdminBusinessListOutput> => {
    const { data } = await apiClient.get<AdminBusinessListOutput>('admin/businesses', { params })
    return data
  },

  /** GET /admin/businesses/:id */
  getBusinessDetail: async (id: string): Promise<AdminBusinessDetail | null> => {
    const { data } = await apiClient.get<AdminBusinessDetail>(`admin/businesses/${id}`)
    return data
  },
}
