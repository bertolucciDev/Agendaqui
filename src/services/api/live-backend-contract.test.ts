import { describe, it, expect, beforeAll } from 'vitest'

/**
 * Contrato do FRONTEND contra o BACKEND REAL (não o mock).
 *
 * Este arquivo é a prova de que a camada de API do frontend — os mappers, os
 * unwraps de envelope, os nomes de campo — conversa de fato com a API NestJS
 * que está no ar. O `api-contract.test.ts` valida o mesmo contrato contra o
 * mock; este valida contra o servidor de verdade.
 *
 * Requer o backend no ar: `node dist/src/main.js` (porta 3000).
 * Rodar com: `npx vitest run src/services/api/live-backend-contract.test.ts`
 *
 * Se o backend não estiver no ar, a suíte é SKIPPED (não falha) — assim ela
 * pode rodar no CI sem infraestrutura.
 */

const REAL_API = 'http://localhost:3000'
const OWNER = { email: 'owner@demo.com', password: 'demo123456' }

let backendOnline = false

async function api() {
  const { apiClient } = await import('@/lib/axios/client')
  return apiClient
}

async function login() {
  const client = await api()
  const res = await client.post('auth/login', OWNER)
  const data = res.data as { accessToken: string; refreshToken: string }
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  return data
}

beforeAll(async () => {
  // Redefine o env de build para apontar à API real (o `.env` do projeto usa
  // `/agendaqui-api/`, que só existe atrás do proxy do Vite).
  import.meta.env.VITE_API_URL = `${REAL_API}/`
  import.meta.env.VITE_USE_MOCK = 'false'
  try {
    await login()
    backendOnline = true
  } catch {
    backendOnline = false
  }
}, 60_000)

// Helper: pula o teste se o backend não estiver no ar.
const itLive = (name: string, fn: () => Promise<void> | void, timeout?: number) =>
  it(name, async () => {
    if (!backendOnline) return
    await fn()
  }, timeout)

describe('login → /auth/me', () => {
  itLive('devolve accessToken e refreshToken', async () => {
    const tokens = await login()
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
  })

  itLive('GET /auth/me devolve o perfil com createdAt (FIX 4)', async () => {
    const client = await api()
    const res = await client.get('auth/me')
    const me = res.data as Record<string, unknown>

    expect(me.id).toBeTruthy()
    expect(me.email).toBe(OWNER.email)
    expect(me.createdAt).toBeTruthy()
    expect(me.emailVerifiedAt).toBeDefined()
    expect(me.status).toBe('ACTIVE')
    // A senha nunca pode vazar
    expect(me.password).toBeUndefined()
    expect(me.passwordHash).toBeUndefined()
  })
})

describe('GET /me/session (contrato congelado)', () => {
  itLive('devolve availableModes, businesses, preferences e isPlatformAdmin', async () => {
    const client = await api()
    const res = await client.get('me/session')
    const session = res.data as Record<string, any>

    expect(Array.isArray(session.availableModes)).toBe(true)
    expect(session.availableModes).toContain('OWNER')
    // FIX 3a: dono sem vínculo EMPLOYEE não recebe 'PROFESSIONAL'
    expect(session.availableModes).not.toContain('PROFESSIONAL')

    expect(Array.isArray(session.businesses)).toBe(true)
    expect(session.businesses.length).toBeGreaterThan(0)

    const biz = session.businesses[0]
    expect(biz.id).toBeTruthy()
    expect(biz.name).toBeTruthy()
    expect(Array.isArray(biz.memberships)).toBe(true)

    const membership = biz.memberships[0]
    expect(membership.role).toBe('OWNER')
    expect(Array.isArray(membership.locationIds)).toBe(true)
    expect(membership.locationIds.length).toBeGreaterThan(0)
    expect(membership.active).toBe(true)

    // FIX 3b: matriz exata de OWNER
    expect(membership.permissions).toEqual([
      'business:manage',
      'staff:write',
      'services:write',
      'appointments:write',
      'appointments:read',
      'customers:read',
    ])

    expect(session.preferences).toBeDefined()
    expect(session.preferences).toHaveProperty('activeMode')
    expect(session.preferences).toHaveProperty('activeBusinessId')
    expect(typeof session.isPlatformAdmin).toBe('boolean')
  })
})

describe('listagem de equipe (endpoint NOVO)', () => {
  itLive('GET /businesses/:businessId/employees devolve Membership[] com user e workingHours', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id

    const res = await client.get(`businesses/${businessId}/employees`)
    const list = res.data as any[]

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)

    const member = list[0]
    expect(member.id).toBeTruthy()
    expect(member.userId).toBeTruthy()
    expect(member.locationId).toBeTruthy()
    expect(member.role).toBeTruthy()
    expect(member.position).toBeTruthy()
    expect(typeof member.active).toBe('boolean')
    // FIX do mapper: o vínculo embute o usuário
    expect(member.user).toBeDefined()
    expect(member.user.id).toBeTruthy()
    expect(member.user.name).toBeTruthy()
    expect(member.user.email).toBeTruthy()
    // E os horários de trabalho
    expect(Array.isArray(member.workingHours)).toBe(true)
  })
})

describe('listagem de serviços / locais / profissionais', () => {
  itLive('GET /businesses/:slug/services devolve { data, total, limit, offset }', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id

    const biz = (await client.get(`businesses/${businessId}`)).data as Record<string, any>
    const slug = biz.slug

    const res = await client.get(`businesses/${slug}/services`)
    const body = res.data as Record<string, any>

    expect(body).toHaveProperty('data')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('limit')
    expect(body).toHaveProperty('offset')

    if (body.data.length > 0) {
      const svc = body.data[0]
      expect(svc.id).toBeTruthy()
      expect(svc.name).toBeTruthy()
      expect(typeof svc.priceCents).toBe('number')
      expect(typeof svc.durationMinutes).toBe('number')
      expect(typeof svc.active).toBe('boolean')
      expect(svc.createdAt).toBeTruthy()
    }
  })

  itLive('GET /businesses/:slug/locations devolve { data, total, limit, offset }', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id
    const biz = (await client.get(`businesses/${businessId}`)).data as Record<string, any>

    const res = await client.get(`businesses/${biz.slug}/locations`)
    const body = res.data as Record<string, any>

    expect(Array.isArray(body.data)).toBe(true)
    expect(body).toHaveProperty('total')
    if (body.data.length > 0) {
      expect(body.data[0].id).toBeTruthy()
      expect(body.data[0].name).toBeTruthy()
      expect(body.data[0].timezone).toBeTruthy()
    }
  })

  itLive('GET /businesses/:slug inexistente devolve 404', async () => {
    const client = await api()
    await expect(client.get('businesses/slug-que-nao-existe-xyz/services')).rejects.toMatchObject({
      response: { status: 404 },
    })
  })
})

describe('GET /businesses/:id/appointments', () => {
  itLive('devolve { data, total, limit, offset } com campos planos (sem prefixo "_")', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id

    const res = await client.get(`businesses/${businessId}/appointments`)
    const body = res.data as Record<string, any>

    expect(Array.isArray(body.data)).toBe(true)
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('limit')
    expect(body).toHaveProperty('offset')

    if (body.data.length > 0) {
      const apt = body.data[0]
      // FIX 2: chaves do contrato, sem o prefixo "_" do ClassSerializerInterceptor
      expect(apt.id).toBeTruthy()
      expect(apt.businessId).toBeTruthy()
      expect(apt.locationId).toBeTruthy()
      expect(apt.serviceId).toBeTruthy()
      expect(apt.startsAt).toBeTruthy()
      expect(apt.endsAt).toBeTruthy()
      expect(apt.status).toBeTruthy()
      expect(apt._id).toBeUndefined()
      expect(apt._status).toBeUndefined()
      expect(apt._startsAt).toBeUndefined()
      // Contrato congelado: vocabulário do domínio (sem aliases duplicados)
      expect(apt.customerUserId).toBeTruthy()
      expect(apt.cancellationReason).toBeDefined()
      expect(apt.cancelledAt).toBeDefined()
    }
  })

  itLive('rejeita intervalo invertido (dateFrom > dateTo) com 400', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id

    await expect(
      client.get(
        `businesses/${businessId}/appointments?dateFrom=2030-06-01&dateTo=2030-01-01`,
      ),
    ).rejects.toMatchObject({ response: { status: 400 } })
  })
})

describe('GET /businesses/:id/slots', () => {
  itLive('devolve slots com startsAt/endsAt/employeeMembershipId (aliases do FIX 4)', async () => {
    const client = await api()
    const session = (await client.get('me/session')).data as Record<string, any>
    const businessId = session.businesses[0].id
    const categories = (await client.get('categories')).data as any[]
    const categoryId = categories[0]?.id

    // O seed grava serviço/local com id textual (`svc-corte-cabelo`), mas os
    // DTOs de slots validam `serviceId`/`locationId` como UUID. Criamos os dois
    // via API para exercitar o caminho real de produção.
    const service = (await client.post(`businesses/${businessId}/services`, {
      categoryId,
      name: `QA Serviço Slots ${Date.now()}`,
      priceCents: 5000,
      durationMinutes: 30,
      bufferMinutes: 5,
    })).data as Record<string, any>
    const serviceId = service.serviceId ?? service.id

    const created = (await client.post(`businesses/${businessId}/locations`, {
      name: `QA Loc Slots ${Date.now()}`,
      address: 'Rua QA Slots, 100',
      timezone: 'America/Sao_Paulo',
      attendanceType: 'AT_LOCATION',
    })).data as Record<string, any>
    const locationId = created.id ?? created.locationId

    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 6)

    const res = await client.get(
      `businesses/${businessId}/slots?serviceId=${serviceId}&locationId=${locationId}` +
        `&dateFrom=${from.toISOString()}&dateTo=${to.toISOString()}`,
    )
    const slots = res.data as any[]

    expect(Array.isArray(slots)).toBe(true)
    if (slots.length > 0) {
      const slot = slots[0]
      // FIX 4: as chaves novas existem
      expect(slot.startsAt).toBeTruthy()
      expect(slot.endsAt).toBeTruthy()
      expect(slot.employeeMembershipId).toBeTruthy()
      // ...e as antigas continuam lá
      expect(slot.startAt).toBeTruthy()
      expect(slot.endAt).toBeTruthy()
      expect(slot.professionalId).toBeTruthy()
    }
  })
})

describe('novos endpoints de perfil', () => {
  itLive('PATCH /users/me atualiza o perfil do usuário autenticado', async () => {
    const client = await api()
    const me = (await client.get('auth/me')).data as Record<string, any>
    const originalName = me.name as string

    const newName = `QA Nome ${Date.now()}`
    const res = await client.patch('users/me', { name: newName })
    const body = res.data as Record<string, any>

    expect(body.id).toBe(me.id)
    expect(body.name).toBe(newName)
    expect(body.email).toBe(me.email)
    expect(body.createdAt).toBeTruthy()

    // restaura
    await client.patch('users/me', { name: originalName })
  })

  itLive('POST /auth/change-password rejeita senha atual errada com 401', async () => {
    const client = await api()
    await expect(
      client.post('auth/change-password', {
        currentPassword: 'senha-errada-123',
        newPassword: 'NovaSenha123',
      }),
    ).rejects.toMatchObject({ response: { status: 401 } })
  })

  itLive('POST /auth/change-password rejeita senha nova fraca com 400', async () => {
    const client = await api()
    await expect(
      client.post('auth/change-password', {
        currentPassword: OWNER.password,
        newPassword: 'abc',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } })
  })
})

describe('GET /categories', () => {
  itLive('devolve array PLANO com { id, name, slug, parentId } (sem árvore)', async () => {
    const client = await api()
    const res = await client.get('categories')
    const list = res.data as any[]

    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].id).toBeTruthy()
    expect(list[0].name).toBeTruthy()
    expect(list[0].slug).toBeTruthy()
    // NÃO é mais uma árvore com `children`
    expect(list[0].children).toBeUndefined()
  })
})
