import { apiClient } from '@/lib/axios/client'
import type { LocationInventory, PosPaymentMethod, PosProduct, PosSale, PosSalePage } from '@/types/pos'

function unwrapList<T>(payload: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload?.data) ? payload.data : []
}

export const posApi = {
  listProducts: async (businessId: string): Promise<PosProduct[]> => {
    const { data } = await apiClient.get<PosProduct[] | { data?: PosProduct[] }>(
      `businesses/${businessId}/products`
    )
    return unwrapList(data)
  },

  createProduct: async (
    businessId: string,
    payload: { name: string; sku?: string; description?: string; priceCents: number }
  ): Promise<PosProduct> => {
    const { data } = await apiClient.post<PosProduct>(`businesses/${businessId}/products`, payload)
    return data
  },

  updateProduct: async (
    businessId: string,
    productId: string,
    payload: Partial<Pick<PosProduct, 'name' | 'sku' | 'description' | 'priceCents' | 'active'>>
  ): Promise<PosProduct> => {
    const { data } = await apiClient.patch<PosProduct>(
      `businesses/${businessId}/products/${productId}`,
      payload
    )
    return data
  },

  listInventory: async (businessId: string, locationId: string): Promise<LocationInventory[]> => {
    const params = new URLSearchParams({ locationId })
    const { data } = await apiClient.get<LocationInventory[] | { data?: LocationInventory[] }>(
      `businesses/${businessId}/inventory?${params}`
    )
    return unwrapList(data)
  },

  adjustInventory: async (
    businessId: string,
    payload: {
      productId: string
      locationId: string
      type: 'STOCK_IN' | 'ADJUSTMENT'
      quantityDelta: number
      reason: string
    }
  ): Promise<LocationInventory> => {
    const { data } = await apiClient.post<LocationInventory>(
      `businesses/${businessId}/inventory/movements`,
      payload
    )
    return data
  },

  getCatalog: async (businessId: string, locationId: string): Promise<LocationInventory[]> => {
    const params = new URLSearchParams({ businessId, locationId })
    const { data } = await apiClient.get<LocationInventory[] | { data?: LocationInventory[] }>(
      `me/pos/catalog?${params}`
    )
    return unwrapList(data)
  },

  createSale: async (payload: {
    businessId: string
    locationId: string
    items: Array<{ productId: string; quantity: number }>
    paymentMethod: PosPaymentMethod
  }): Promise<PosSale> => {
    const { data } = await apiClient.post<PosSale>('me/pos/sales', payload)
    return data
  },

  listSales: async (
    businessId: string,
    options: { page?: number; limit?: number; locationId?: string; dateFrom?: string; dateTo?: string } = {}
  ): Promise<PosSalePage> => {
    const params = new URLSearchParams({
      page: String(options.page ?? 1),
      limit: String(options.limit ?? 20),
    })
    if (options.locationId) params.set('locationId', options.locationId)
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    const { data } = await apiClient.get<PosSalePage>(`businesses/${businessId}/sales?${params}`)
    return data
  },
}
