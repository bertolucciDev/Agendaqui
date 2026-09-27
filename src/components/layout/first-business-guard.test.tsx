import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const useSessionMock = vi.fn()
vi.mock('@/app/providers/session', () => ({
  useSession: () => useSessionMock(),
}))

import { FirstBusinessGuard } from './first-business-guard'

/* FE-MVP-01 — testes 1–4: regra de primeiro acesso.
 * Critério é o catálogo de businesses administrativos/profissionais (session.businesses),
 * NÃO availableModes. CUSTOMER-only (businesses=[]) entra no onboarding;
 * funcionário convidado (membership presente → business no catálogo) não entra. */

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="path">{loc.pathname}</div>
}

function mount(sessionState: { session: any; isSessionLoading: boolean }, initial = '/dashboard') {
  useSessionMock.mockReturnValue(sessionState)
  const AdminContent = () => (
    <FirstBusinessGuard>
      <LocationProbe />
    </FirstBusinessGuard>
  )
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="*" element={<AdminContent />} />
      </Routes>
    </MemoryRouter>,
  )
}

const baseSession = (businesses: any[], availableModes: string[] = ['OWNER']) => ({
  user: { id: 'u1' },
  availableModes,
  businesses,
  customerProfile: null,
  isPlatformAdmin: false,
  preferences: { activeMode: null, activeBusinessId: null },
})

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

describe('FirstBusinessGuard', () => {
  it('1. usuário sem business administrativo → redireciona para /onboarding/business', () => {
    mount({ session: baseSession([], ['OWNER']), isSessionLoading: false })
    expect(screen.getByTestId('path').textContent).toBe('/onboarding/business')
  })

  it('2. usuário com business administrativo → NÃO entra no onboarding', () => {
    mount({ session: baseSession([{ id: 'b1', name: 'Spa', memberships: [] }]), isSessionLoading: false })
    expect(screen.getByTestId('path').textContent).toBe('/dashboard')
  })

  it('3. funcionário convidado (membership → business no catálogo) → NÃO entra no onboarding', () => {
    const session = baseSession(
      [{ id: 'b9', name: 'Host', memberships: [{ id: 'm9', role: 'EMPLOYEE', locationIds: ['l1'], permissions: [], active: true }] }],
      ['PROFESSIONAL'],
    )
    mount({ session, isSessionLoading: false })
    expect(screen.getByTestId('path').textContent).toBe('/dashboard')
  })

  it('4. usuário CUSTOMER-only (availableModes=["CUSTOMER"], businesses=[]) → onboarding administrativo', () => {
    const session = { ...baseSession([], ['CUSTOMER']), customerProfile: { id: 'u1' } }
    mount({ session, isSessionLoading: false })
    expect(screen.getByTestId('path').textContent).toBe('/onboarding/business')
  })

  it('loading: sem redirect enquanto a sessão carrega', () => {
    mount({ session: null, isSessionLoading: true })
    expect(screen.queryByTestId('path')).toBeNull()
  })

  it('na rota /onboarding/business não há loop de redirect', () => {
    mount({ session: baseSession([]), isSessionLoading: false }, '/onboarding/business')
    expect(screen.getByTestId('path').textContent).toBe('/onboarding/business')
  })
})
