import { describe, it, expect, beforeEach } from 'vitest'
import { handleRequest, ApiError } from './handlers'
import { getDb, resetDb } from './db'

/**
 * FE-API-01 — paridade do mock do PATCH /me/preferences com o backend (pós P2-A/B):
 * undefined → preservar · valor → atualizar · null → limpar · 400 payload/tipo · 403 catálogo.
 */

const q = () => new URLSearchParams()
const patch = (body: unknown) => handleRequest('patch', '/me/preferences', q(), body)
const getSession = () => handleRequest('get', '/me/session', q(), undefined)

function loginAs(userId: string) {
  localStorage.setItem('accessToken', `mock-user-${userId}`)
}

function freshUser(email: string): string {
  const r = handleRequest('post', '/users', q(), { name: 'T', email })
  return (r.body as { id: string }).id
}

function createBusiness(name: string): string {
  const r = handleRequest('post', '/businesses', q(), { name, locationName: 'L1' })
  return (r.body as { id: string }).id
}

beforeEach(() => {
  localStorage.clear()
  resetDb()
  getDb() // rebuild do seed do dia
})

describe('mock PATCH /me/preferences — semântica parcial (P2-A)', () => {
  it('1. PATCH somente activeMode preserva activeBusinessId', () => {
    const uid = freshUser('m1@t.dev')
    loginAs(uid)
    const b1 = createBusiness('Biz Um')
    const b2 = createBusiness('Biz Dois')

    let r = patch({ activeMode: 'OWNER', activeBusinessId: b1 })
    expect(r.body).toEqual({ activeMode: 'OWNER', activeBusinessId: b1 })

    r = patch({ activeMode: 'OWNER' })
    expect(r.body).toEqual({ activeMode: 'OWNER', activeBusinessId: b1 })

    r = patch({ activeBusinessId: b2 })
    expect(r.body).toEqual({ activeMode: 'OWNER', activeBusinessId: b2 })
  })

  it('3/4/5. null explícito limpa cada campo e ambos (P2-B)', () => {
    const uid = freshUser('m2@t.dev')
    loginAs(uid)
    const b1 = createBusiness('Biz X')

    patch({ activeMode: 'OWNER', activeBusinessId: b1 })

    expect(patch({ activeMode: null }).body).toEqual({ activeMode: null, activeBusinessId: b1 })
    patch({ activeMode: 'OWNER' })
    expect(patch({ activeBusinessId: null }).body).toEqual({ activeMode: 'OWNER', activeBusinessId: null })
    expect(patch({ activeMode: null, activeBusinessId: null }).body).toEqual({
      activeMode: null,
      activeBusinessId: null,
    })
  })

  it('6. body vazio é no-op válido', () => {
    const uid = freshUser('m3@t.dev')
    loginAs(uid)
    const b1 = createBusiness('Biz Y')
    patch({ activeMode: 'OWNER', activeBusinessId: b1 })
    expect(patch({}).body).toEqual({ activeMode: 'OWNER', activeBusinessId: b1 })
    const s = getSession().body as { preferences: unknown }
    expect(s.preferences).toEqual({ activeMode: 'OWNER', activeBusinessId: b1 })
  })

  it('7/8. rejeições: enum inválido 400 · tipo inválido 400 · campo desconhecido 400 · mode indisponível 403 · business externo 403', () => {
    const uid = freshUser('m4@t.dev')
    loginAs(uid)
    createBusiness('Biz Z')

    expect(() => patch({ activeMode: 'INVALID_MODE' })).toThrowError(expect.objectContaining({ status: 400 }))
    expect(() => patch({ activeBusinessId: 123 })).toThrowError(expect.objectContaining({ status: 400 }))
    expect(() => patch({ unknownField: 'x' })).toThrowError(expect.objectContaining({ status: 400 }))
    expect(() => patch({ activeMode: 'PROFESSIONAL' })).toThrowError(expect.objectContaining({ status: 403 }))
    expect(() => patch({ activeBusinessId: 'biz_spa' })).toThrowError(expect.objectContaining({ status: 403 })) // de u_olivia
  })

  it('401 sem usuário corrente', () => {
    getDb().sessionUserId = undefined
    expect(() => patch({ activeMode: 'OWNER' })).toThrowError(
      expect.objectContaining({ status: 401 }) as ApiError,
    )
  })
})

describe('mock /me/session — paridade OWNER via ownerUserId (sem membership inventada)', () => {
  it('owner SEM membership é projetado como virtual-owner:<biz> com locais ativos e permissões OWNER', () => {
    const uid = freshUser('own@t.dev')
    loginAs(uid)
    const b1 = createBusiness('Biz Virtual')

    const s = getSession().body as {
      availableModes: string[]
      businesses: { id: string; memberships: { id: string; role: string; locationIds: string[]; permissions: string[] }[] }[]
    }
    expect(s.availableModes).toContain('OWNER')
    const biz = s.businesses.find((b) => b.id === b1)!
    expect(biz.memberships).toHaveLength(1)
    expect(biz.memberships[0].id).toBe(`virtual-owner:${b1}`)
    expect(biz.memberships[0].role).toBe('OWNER')
    expect(biz.memberships[0].locationIds).toHaveLength(1) // location criada no POST
    expect(biz.memberships[0].permissions).toContain('business:manage')
    // não inventou membership persistida:
    expect(getDb().memberships.some((m) => m.businessId === b1 && m.userId === uid)).toBe(false)
  })

  it('seed demo: u_demo tem modo OWNER (ownerUserId) e matriz EMPLOYEE ganha customers:read', () => {
    loginAs('u_demo')
    const s = getSession().body as { availableModes: string[] }
    expect(s.availableModes).toContain('OWNER')

    loginAs('u_2') // EMPLOYEE da biz_demo
    const s2 = getSession().body as {
      businesses: { memberships: { role: string; permissions: string[] }[] }[]
    }
    const emp = s2.businesses.flatMap((b) => b.memberships).find((m) => m.role === 'EMPLOYEE')!
    expect(emp.permissions).toContain('customers:read')
  })
})
