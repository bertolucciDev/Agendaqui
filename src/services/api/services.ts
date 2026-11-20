import { apiClient } from '@/lib/axios/client'
import type { Service, PaginatedResponse } from '@/types'

/**
 * O backend devolve as listas paginadas no formato
 * `{ data, total, limit, offset }`. Aceitamos também um array puro para
 * não quebrar contra versões antigas da API.
 */
function unwrapList<T>(
  payload: T[] | PaginatedResponse<T> | null | undefined
): T[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

export const servicesApi = {
  /**
   * `GET /businesses/:businessId/services`
   *
   * A rota é paginada (limite padrão 20 no backend) — sem `limit` alto, um
   * negócio com mais de 20 serviços perderia a cauda da lista em silêncio.
   */
  list: async (
    businessId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<Service[]> => {
    const searchParams = new URLSearchParams()
    searchParams.set('limit', String(params?.limit ?? 100))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const { data } = await apiClient.get<Service[] | PaginatedResponse<Service>>(
      `businesses/${businessId}/services?${searchParams.toString()}`
    )
    return unwrapList(data)
  },

  create: async (
    businessId: string,
    payload: {
      categoryId: string
      name: string
      priceCents: number
      durationMinutes: number
      bufferMinutes?: number
      description?: string
    }
  ) => {
    const { data } = await apiClient.post<Service>(
      `businesses/${businessId}/services`,
      payload
    )
    return data
  },

  update: async (id: string, payload: Partial<Service>) => {
    const { data } = await apiClient.put<Service>(`services/${id}`, payload)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`services/${id}`)
  },
}
