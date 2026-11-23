import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/lib/axios/client', () => ({ apiClient: { get, post, patch } }))

describe('posApi contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes catalog to both active business and location', async () => {
    get.mockResolvedValue({ data: [] })
    const { posApi } = await import('@/services/api/pos')

    await posApi.getCatalog('business-1', 'location-2')

    expect(get).toHaveBeenCalledWith(
      'me/pos/catalog?businessId=business-1&locationId=location-2'
    )
  })

  it('sends sale items and payment method without trusting client totals or seller identity', async () => {
    post.mockResolvedValue({ data: { id: 'sale-1' } })
    const { posApi } = await import('@/services/api/pos')

    await posApi.createSale({
      businessId: 'business-1',
      locationId: 'location-2',
      items: [{ productId: 'product-1', quantity: 2 }],
      paymentMethod: 'PIX',
    })

    expect(post).toHaveBeenCalledWith('me/pos/sales', {
      businessId: 'business-1',
      locationId: 'location-2',
      items: [{ productId: 'product-1', quantity: 2 }],
      paymentMethod: 'PIX',
    })
  })

  it('uses owner routes for stock movements and paged sales history', async () => {
    post.mockResolvedValue({ data: {} })
    get.mockResolvedValue({ data: { data: [], total: 0 } })
    const { posApi } = await import('@/services/api/pos')

    await posApi.adjustInventory('business-1', {
      productId: 'product-1',
      locationId: 'location-2',
      type: 'STOCK_IN',
      quantityDelta: 5,
      reason: 'Reposição',
    })
    await posApi.listSales('business-1', { page: 2, limit: 10 })

    expect(post).toHaveBeenCalledWith('businesses/business-1/inventory/movements', {
      productId: 'product-1', locationId: 'location-2', type: 'STOCK_IN', quantityDelta: 5, reason: 'Reposição',
    })
    expect(get).toHaveBeenCalledWith('businesses/business-1/sales?page=2&limit=10')
  })
})
