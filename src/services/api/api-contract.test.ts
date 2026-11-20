import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Contrato da camada de API do FRONTEND contra o mock (que espelha o backend).
 *
 * Este é o teste que teria pegado, antes de virarem bug em produção:
 *  - `locationsApi.list` apontando para a rota pública por slug (locais vazios);
 *  - o booking público passando id do negócio onde a rota exige slug;
 *  - `create` enviando `clientName`/`clientPhone` (400 do ValidationPipe);
 *  - o mapper de slot lendo `startsAt` onde o backend devolve `startAt`;
 *  - `listBusiness` esperando `{data,total,...}` onde vinha um array puro.
 */
vi.stubEnv('VITE_USE_MOCK', 'true')

async function loadApis() {
  const [{ appointmentsApi }, { locationsApi }, { servicesApi }, { staffApi }] = await Promise.all([
    import('@/services/api/appointments'),
    import('@/services/api/locations'),
    import('@/services/api/services'),
    import('@/services/api/staff'),
  ])
  return { appointmentsApi, locationsApi, servicesApi, staffApi }
}

const BUSINESS_ID = 'biz_demo'
const LOCATION_ID = 'loc_demo'

beforeEach(async () => {
  localStorage.clear()
  const { resetDb, getDb } = await import('@/lib/mock/db')
  resetDb()
  getDb()
  const { apiClient } = await import('@/lib/axios/client')
  const token = await apiClient.post('auth/login', {
    email: 'demo@agendaqui.app',
    password: '123456',
  })
  localStorage.setItem('accessToken', token.data.accessToken)
  localStorage.setItem('refreshToken', token.data.refreshToken)
})

describe('locationsApi.list', () => {
  it('usa a rota do DONO (locations/business/:id/locations) e devolve Location[]', async () => {
    const { locationsApi } = await loadApis()
    const locations = await locationsApi.list(BUSINESS_ID)

    expect(Array.isArray(locations)).toBe(true)
    expect(locations.length).toBeGreaterThan(0)
    expect(locations[0]).toHaveProperty('id')
    expect(locations[0]).toHaveProperty('name')
  })
})

describe('servicesApi.list', () => {
  it('desembrulha a paginação e devolve Service[]', async () => {
    const { servicesApi } = await loadApis()
    const services = await servicesApi.list(BUSINESS_ID)

    expect(Array.isArray(services)).toBe(true)
    expect(services.length).toBeGreaterThan(0)
    expect(services[0]).toHaveProperty('name')
    expect(services[0]).toHaveProperty('priceCents')
  })
})

describe('staffApi.listByBusiness', () => {
  it('devolve memberships com o usuário embutido', async () => {
    const { staffApi } = await loadApis()
    const staff = await staffApi.listByBusiness(BUSINESS_ID)

    expect(Array.isArray(staff)).toBe(true)
    expect(staff.length).toBeGreaterThan(0)
    expect(staff[0]).toHaveProperty('role')
    expect(staff[0].user).toHaveProperty('name')
  })
})

describe('appointmentsApi', () => {
  it('listBusiness desembrulha o envelope paginado', async () => {
    const { appointmentsApi } = await loadApis()
    const result = await appointmentsApi.listBusiness(BUSINESS_ID, { limit: 50 })

    expect(Array.isArray(result.data)).toBe(true)
    expect(typeof result.total).toBe('number')
    expect(typeof result.limit).toBe('number')
    expect(typeof result.offset).toBe('number')
  })

  it('listBusiness tolera um array puro (backend antigo)', async () => {
    const { appointmentsApi } = await loadApis()
    const result = await appointmentsApi.listBusiness(BUSINESS_ID)
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('getAvailableSlots mapeia startsAt/endsAt/employeeMembershipId', async () => {
    const { appointmentsApi } = await loadApis()
    const slots = await appointmentsApi.getAvailableSlots(BUSINESS_ID, {
      serviceId: 'svc_1',
      dateFrom: '2030-01-01T00:00:00.000Z',
      dateTo: '2030-01-02T00:00:00.000Z',
      locationId: LOCATION_ID,
    })

    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0].startsAt).toBeTruthy()
    expect(slots[0].endsAt).toBeTruthy()
    expect(slots[0].employeeMembershipId).toBeTruthy()
  })

  it('create NÃO envia clientName/clientPhone (o DTO do backend rejeita)', async () => {
    const { appointmentsApi } = await loadApis()
    await expect(
      appointmentsApi.create(BUSINESS_ID, {
        locationId: LOCATION_ID,
        serviceId: 'svc_1',
        startsAt: '2030-01-01T13:00:00.000Z',
        endsAt: '2030-01-01T13:30:00.000Z',
        // @ts-expect-error — o campo foi removido do contrato de propósito
        clientName: 'Fulano',
      })
    ).rejects.toMatchObject({ response: { status: 400 } })
  })

  it('confirm/complete/noShow/cancel devolvem void (o backend responde 204)', async () => {
    const { appointmentsApi } = await loadApis()
    const appointments = await appointmentsApi.listBusiness(BUSINESS_ID, { limit: 50 })
    const target = appointments.data[0]
    expect(target).toBeTruthy()

    await expect(appointmentsApi.confirm(target.id, target.employeeMembershipId ?? 'mem_1')).resolves.toBeUndefined()
    await expect(appointmentsApi.complete(target.id, target.employeeMembershipId ?? 'mem_1')).resolves.toBeUndefined()
    await expect(appointmentsApi.noShow(target.id, target.employeeMembershipId ?? 'mem_1')).resolves.toBeUndefined()
    await expect(appointmentsApi.cancel(target.id, 'Cliente desistiu')).resolves.toBeUndefined()
  })
})
