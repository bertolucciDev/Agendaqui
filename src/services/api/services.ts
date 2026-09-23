import { apiClient } from '@/lib/axios/client'
import type { Service } from '@/types'

export const servicesApi = {
  list: async (businessId: string) => {
    const { data } = await apiClient.get<Service[]>(
      `businesses/${businessId}/services`
    )
    return data
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
