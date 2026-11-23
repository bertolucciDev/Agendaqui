import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubEnv('VITE_USE_MOCK', 'true')

const BUSINESS_ID = 'biz_demo'
const LOCATION_ID = 'loc_demo'

async function login(email: string) {
  const { apiClient } = await import('@/lib/axios/client')
  const { data } = await apiClient.post<{ accessToken: string }>('auth/login', { email, password: 'demo123456' })
  localStorage.setItem('accessToken', data.accessToken)
}

describe('mock POS flow', () => {
  beforeEach(async () => {
    localStorage.clear()
    const { resetDb, getDb } = await import('@/lib/mock/db')
    resetDb()
    getDb()
    await login('demo@agendaqui.app')
  })

  it('records a sale and reduces only the selected location inventory', async () => {
    const [{ businessesApi }, { posApi }] = await Promise.all([
      import('@/services/api/businesses'),
      import('@/services/api/pos'),
    ])
    await businessesApi.update(BUSINESS_ID, { sellsProducts: true })
    const product = await posApi.createProduct(BUSINESS_ID, {
      name: 'Refrigerante',
      priceCents: 750,
    })
    await posApi.adjustInventory(BUSINESS_ID, {
      productId: product.id,
      locationId: LOCATION_ID,
      type: 'STOCK_IN',
      quantityDelta: 1,
      reason: 'Reposição',
    })

    await login('carlos.andrade@barbeariaelite.com')
    const catalog = await posApi.getCatalog(BUSINESS_ID, LOCATION_ID)
    expect(catalog.find((item) => item.id === product.id)?.quantity).toBe(1)

    const sale = await posApi.createSale({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'PIX',
    })
    expect(sale.totalCents).toBe(750)
    expect(sale.items[0].productName).toBe('Refrigerante')

    await login('demo@agendaqui.app')
    const [selectedLocation, otherLocation] = await Promise.all([
      posApi.listInventory(BUSINESS_ID, LOCATION_ID),
      posApi.listInventory(BUSINESS_ID, 'loc_2'),
    ])
    expect(selectedLocation.find((item) => item.id === product.id)?.quantity).toBe(0)
    expect(otherLocation.find((item) => item.id === product.id)?.quantity).toBe(0)
  })

  it('rejects checkout when the selected location has no stock', async () => {
    const [{ businessesApi }, { posApi }] = await Promise.all([
      import('@/services/api/businesses'),
      import('@/services/api/pos'),
    ])
    await businessesApi.update(BUSINESS_ID, { sellsProducts: true })
    const product = await posApi.createProduct(BUSINESS_ID, { name: 'Água', priceCents: 300 })

    await login('carlos.andrade@barbeariaelite.com')
    await expect(posApi.createSale({
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      items: [{ productId: product.id, quantity: 1 }],
      paymentMethod: 'CASH',
    })).rejects.toMatchObject({ response: { status: 409 } })
  })
})
