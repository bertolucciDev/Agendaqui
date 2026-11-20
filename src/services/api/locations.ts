import { apiClient } from '@/lib/axios/client'
import type { Location, Holiday, PaginatedResponse } from '@/types'

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

export const locationsApi = {
  /**
   * `GET /locations/business/:businessId/locations`
   *
   * A rota pública `GET /businesses/:slug/locations` é indexada por SLUG e
   * devolve a visão pública do negócio; usá-la com o id do negócio (que é o
   * que a sessão expõe) fazia a tela de Locais voltar vazia.
   */
  list: async (businessId: string): Promise<Location[]> => {
    const { data } = await apiClient.get<Location[] | PaginatedResponse<Location>>(
      `locations/business/${businessId}/locations`
    )
    return unwrapList(data)
  },

  create: async (
    businessId: string,
    payload: {
      name: string
      address: string
      timezone: string
      latitude?: number
      longitude?: number
      attendanceType?: string
      phone?: string
      isHeadquarter?: boolean
    }
  ) => {
    const { data } = await apiClient.post<Location>(
      `businesses/${businessId}/locations`,
      payload
    )
    return data
  },

  update: async (id: string, payload: Partial<Location>) => {
    const { data } = await apiClient.put<Location>(`locations/${id}`, payload)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`locations/${id}`)
  },

  createHoliday: async (locationId: string, date: string, name: string) => {
    const { data } = await apiClient.post<Holiday>(
      `locations/${locationId}/holidays`,
      { date, name }
    )
    return data
  },

  deleteHoliday: async (id: string) => {
    await apiClient.delete(`holidays/${id}`)
  },
}
