import { apiClient } from '@/lib/axios/client'
import {
  getStoredBusinesses,
  removeStoredBusiness,
  saveStoredBusiness,
  slugify,
  type StoredBusiness,
} from '@/lib/business-store'
import type { Business, PaginatedResponse, Service } from '@/types'

const toBusiness = (stored: StoredBusiness): Business => ({
  id: stored.businessId,
  name: stored.name,
  slug: stored.slug,
  document: '',
  type: 'COMPANY',
  categoryId: '',
  createdAt: '',
})

export const businessesApi = {
  list: async (): Promise<Business[]> => {
    return getStoredBusinesses().map(toBusiness)
  },

  create: async (payload: {
    name: string
    document: string
    type: string
    categoryId: string
    locationName: string
    address: string
    timezone: string
    latitude?: number
    longitude?: number
    attendanceType?: string
    phone?: string
    description?: string
  }) => {
    const { data } = await apiClient.post<Business & {
      businessId?: string
      locationId?: string
      membershipId?: string
    }>('businesses', payload)

    const businessId = data.businessId || data.id
    const stored: StoredBusiness = {
      businessId,
      locationId: data.locationId || '',
      membershipId: data.membershipId || '',
      slug: slugify(payload.name),
      name: payload.name,
    }
    saveStoredBusiness(stored)
    return toBusiness(stored)
  },

  update: async (id: string, payload: Partial<Business>) => {
    const { data } = await apiClient.put<Business>(`businesses/${id}`, payload)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`businesses/${id}`)
    removeStoredBusiness(id)
  },

  getBySlug: async (slug: string) => {
    const { data } = await apiClient.get<Business>(`businesses/${slug}`)
    return data
  },

  getServicesBySlug: async (slug: string, page?: number, limit?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const { data } = await apiClient.get<PaginatedResponse<Service>>(
      `businesses/${slug}/services?${params.toString()}`
    )
    return data
  },
}
