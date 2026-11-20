import { apiClient } from '@/lib/axios/client'
import type {
  AdminPrivacyRequestList,
  PrivacyRequest,
  PrivacyRequestStatus,
  PrivacyRequestType,
  PrivacyDataExport,
} from '@/types/privacy'

export const privacyApi = {
  exportData: async (): Promise<PrivacyDataExport> => {
    const { data } = await apiClient.get<PrivacyDataExport>('me/privacy-data')
    return data
  },
  downloadDocument: async (documentId: string): Promise<Blob> => {
    const { data } = await apiClient.get<Blob>(`me/privacy-data/documents/${documentId}`, {
      responseType: 'blob',
    })
    return data
  },
  listMine: async (): Promise<PrivacyRequest[]> => {
    const { data } = await apiClient.get<PrivacyRequest[]>('me/privacy-requests')
    return data
  },
  create: async (type: PrivacyRequestType): Promise<PrivacyRequest> => {
    const { data } = await apiClient.post<PrivacyRequest>('me/privacy-requests', { type })
    return data
  },
  cancel: async (id: string): Promise<void> => {
    await apiClient.post(`me/privacy-requests/${id}/cancel`)
  },
  respondWithInformation: async (id: string, message: string): Promise<void> => {
    await apiClient.post(`me/privacy-requests/${id}/information`, { message })
  },
}

export const adminPrivacyApi = {
  list: async (params?: {
    status?: PrivacyRequestStatus
    limit?: number
    offset?: number
  }): Promise<AdminPrivacyRequestList> => {
    const { data } = await apiClient.get<AdminPrivacyRequestList>('me/admin/privacy-requests', { params })
    return data
  },
  updateStatus: async (
    id: string,
    status: PrivacyRequestStatus,
    responseMessage?: string,
  ): Promise<void> => {
    await apiClient.patch(`me/admin/privacy-requests/${id}/status`, { status, responseMessage })
  },
}
