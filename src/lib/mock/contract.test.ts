import { describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import { createMockAdapter } from './index'
import { getDb, resetDb } from './db'

/**
 * Contrato do mock contra a API real.
 *
 * O mock é a superfície usada pelo modo demo e pelos testes; se ele divergir
 * do backend, o app "funciona" no mock e quebra em produção (ou o inverso).
 * Aqui exercitamos, pelo MESMO adapter que o app usa, as rotas que o
 * frontend realmente chama — inclusive as que quebraram durante a integração.
 */

const adapter = createMockAdapter()
const client = axios.create({ baseURL: '/agendaqui-api', adapter })

/* O app real desembrulha `{ data: ... }` num interceptor do axios — o teste
 * usa o MESMO interceptor para validar o contrato como o usuário o vê. */
client.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data
  }
  return response
})

const mem: Record<string, string> = {}
beforeEach(() => {
  Object.keys(mem).forEach((k) => delete mem[k])
  localStorage.clear()
  resetDb()
  getDb()
})

const login = async () => {
  const { data } = await client.post('auth/login', {
    email: 'demo@agendaqui.app',
    password: '123456',
  })
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  return data
}

describe('mock — envelope e contrato de /me/session', () => {
  it('login devolve SOMENTE os tokens (como o backend real)', async () => {
    const data = await login()
    expect(data.accessToken).toBeTruthy()
    expect(data.refreshToken).toBeTruthy()
    expect(data.user).toBeUndefined()
  })

  it('GET /auth/me devolve o perfil com createdAt', async () => {
    await login()
    const { data } = await client.get('auth/me')
    expect(data.id).toBe('u_demo')
    expect(data.email).toBe('demo@agendaqui.app')
    expect(data.createdAt).toBeTruthy()
  })

  it('GET /me/session devolve o contrato congelado', async () => {
    await login()
    const { data } = await client.get('me/session')
    expect(data.user.id).toBe('u_demo')
    expect(Array.isArray(data.availableModes)).toBe(true)
    expect(Array.isArray(data.businesses)).toBe(true)
    expect(data.preferences).toHaveProperty('activeMode')
    expect(data.preferences).toHaveProperty('activeBusinessId')
  })
})

describe('mock — listagens usadas pelas telas do dono', () => {
  it('GET /businesses/:id/professionals devolve os profissionais com seus serviços', async () => {
    await login()
    const { data } = await client.get('businesses/biz_demo/professionals?limit=100')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    expect(data.data[0]).toHaveProperty('id')
    expect(data.data[0]).toHaveProperty('userId')
    expect(data.data[0]).toHaveProperty('role')
    expect(Array.isArray(data.data[0].services)).toBe(true)
  })

  it('GET /businesses/:id/employees devolve memberships com user', async () => {
    await login()
    const { data } = await client.get('businesses/biz_demo/employees')
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('userId')
    expect(data[0]).toHaveProperty('role')
    expect(data[0].user).toHaveProperty('name')
  })

  it('GET /locations/business/:businessId/locations devolve a lista paginada', async () => {
    await login()
    const { data } = await client.get('locations/business/biz_demo/locations')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    expect(data.data[0]).toHaveProperty('businessId')
    expect(data).toHaveProperty('total')
  })

  it('GET /businesses/:id/services pagina e traz businessId/categoryId', async () => {
    await login()
    const { data } = await client.get('businesses/biz_demo/services?limit=100')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    expect(data.data[0]).toHaveProperty('businessId')
    expect(data.data[0]).toHaveProperty('categoryId')
    expect(data).toHaveProperty('total')
  })
})

describe('mock — agendamentos e slots', () => {
  it('GET /businesses/:id/appointments devolve o envelope paginado', async () => {
    await login()
    const { data } = await client.get('businesses/biz_demo/appointments?limit=100')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data).toHaveProperty('total')
    expect(data).toHaveProperty('limit')
    expect(data).toHaveProperty('offset')
  })

  it('GET /businesses/:id/slots devolve as duas grafias de horário', async () => {
    await login()
    const { data } = await client.get(
      'businesses/biz_demo/slots?serviceId=svc_1&dateFrom=2030-01-01T00:00:00.000Z&dateTo=2030-01-02T00:00:00.000Z&locationId=loc_demo'
    )
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('startsAt')
    expect(data[0]).toHaveProperty('endsAt')
    expect(data[0]).toHaveProperty('employeeMembershipId')
    // aliases do backend
    expect(data[0]).toHaveProperty('startAt')
    expect(data[0]).toHaveProperty('endAt')
    expect(data[0]).toHaveProperty('professionalId')
  })

  it('POST /businesses/:id/appointments REJEITA clientName/clientPhone (400)', async () => {
    await login()
    await expect(
      client.post('businesses/biz_demo/appointments', {
        locationId: 'loc_demo',
        serviceId: 'svc_1',
        startsAt: '2030-01-01T13:00:00.000Z',
        endsAt: '2030-01-01T13:30:00.000Z',
        clientName: 'Fulano',
      })
    ).rejects.toMatchObject({ response: { status: 400 } })
  })
})

describe('mock — criação de negócio pelo fluxo novo', () => {
  it('POST /businesses responde 410 (criação via Business Verification)', async () => {
    await login()
    await expect(
      client.post('businesses', { name: 'X', document: '123', type: 'COMPANY', categoryId: 'x' })
    ).rejects.toMatchObject({ response: { status: 410 } })
  })
})
