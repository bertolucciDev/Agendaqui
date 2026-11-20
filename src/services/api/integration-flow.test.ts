import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Fluxo completo de um dono de negócio, do login à equipe — contra o mock,
 * que espelha a API real.
 *
 * É o teste que responde "a integração funciona?" de ponta a ponta:
 * autenticar → ler o contrato de sessão → resolver o contexto → listar
 * a equipe → convidar um membro.
 */
vi.stubEnv('VITE_USE_MOCK', 'true')

const { resetDb, getDb } = await import('@/lib/mock/db')
const { apiClient } = await import('@/lib/axios/client')
const { authApi } = await import('@/services/api/auth')
const { sessionApi } = await import('@/services/api/session')
const { staffApi } = await import('@/services/api/staff')

beforeEach(() => {
  localStorage.clear()
  resetDb()
  getDb()
})

describe('fluxo do dono — login → sessão → equipe → convite', () => {
  it('o login entrega tokens e o perfil vem de GET /auth/me', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()

    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const me = await authApi.getMe()
    expect(me.email).toBe('demo@agendaqui.app')
    expect(me.createdAt).toBeTruthy()
  })

  it('o contrato de sessão entrega o negócio do dono com papel OWNER', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const session = await sessionApi.getSession()
    expect(session.user.id).toBe('u_demo')
    expect(session.availableModes.length).toBeGreaterThan(0)

    const business = session.businesses[0]
    expect(business).toBeTruthy()
    expect(business.memberships.some((m) => m.role === 'OWNER')).toBe(true)
  })

  it('a equipe do negócio é listável e o convite entra na lista', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const session = await sessionApi.getSession()
    const business = session.businesses[0]

    const before = await staffApi.listByBusiness(business.id)
    expect(before.length).toBeGreaterThan(0)

    const invite = await staffApi.inviteEmployee(business.id, {
      email: 'novo.membro@agendaqui.app',
      locationId: before[0].locationId,
      role: 'EMPLOYEE',
      position: 'Barbeiro',
    })
    expect(invite.inviteId).toBeTruthy()

    const after = await staffApi.listByBusiness(business.id)
    expect(after.length).toBe(before.length + 1)
  })

  it('a listagem de equipe traz o usuário embutido (a UI mostra o nome)', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const session = await sessionApi.getSession()
    const staff = await staffApi.listByBusiness(session.businesses[0].id)

    for (const member of staff) {
      expect(member.user).toBeTruthy()
      expect(member.user?.name).toBeTruthy()
      expect(member.role).toBeTruthy()
    }
  })

  it('o dono consegue mudar o nível de acesso de um membro (PUT /employees/:id)', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const session = await sessionApi.getSession()
    const staff = await staffApi.listByBusiness(session.businesses[0].id)
    const target = staff.find((m) => m.role === 'EMPLOYEE')
    expect(target).toBeTruthy()

    const updated = await staffApi.updateEmployee(target!.id, { role: 'MANAGER' })
    expect(updated.role).toBe('MANAGER')
  })

  it('as preferências de sessão são persistidas com a semântica do contrato', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    const session = await sessionApi.getSession()
    const business = session.businesses[0]

    const prefs = await sessionApi.updatePreferences({
      activeMode: 'OWNER',
      activeBusinessId: business.id,
    })
    expect(prefs.activeMode).toBe('OWNER')
    expect(prefs.activeBusinessId).toBe(business.id)

    const cleared = await sessionApi.updatePreferences({ activeMode: null })
    expect(cleared.activeMode).toBeNull()
  })

  it('o contrato de sessão não é quebrado por um endpoint inexistente', async () => {
    const tokens = await authApi.login('demo@agendaqui.app', '123456')
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)

    await expect(apiClient.get('businesses/nao-existe/employees')).rejects.toBeTruthy()
    await expect(apiClient.get('me/nao-existe')).rejects.toBeTruthy()
  })
})
