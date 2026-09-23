import { apiClient } from '@/lib/axios/client'
import type { Location, Holiday } from '@/types'

export const locationsApi = {
  list: async (businessId: string) => {
    const { data } = await apiClient.get<Location[]>(
      `businesses/${businessId}/locations`
    )
    return data
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
