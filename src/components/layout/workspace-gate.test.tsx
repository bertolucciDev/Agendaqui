import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const useSessionMock = vi.fn()
const useWorkspaceMock = vi.fn()

vi.mock('@/app/providers/session', () => ({
  useSession: () => useSessionMock(),
}))
vi.mock('@/app/providers/workspace', () => ({
  useWorkspace: () => useWorkspaceMock(),
}))

import { WorkspaceGate } from './workspace-gate'
import type { ReactNode } from 'react'

const children: ReactNode = <div data-testid="content">app</div>

afterEach(() => cleanup())
beforeEach(() => {
  vi.clearAllMocks()
  useWorkspaceMock.mockReturnValue({
    activeMode: null,
    availableModes: ['OWNER', 'PROFESSIONAL', 'CUSTOMER'],
    businessesForMode: [],
    needsSelection: true,
    switchMode: vi.fn(),
    switchBusiness: vi.fn(),
  })
})

/* FE-MVP-01 — CUSTOMER fora da seleção administrativa do MVP (contrato intocado). */
describe('WorkspaceGate — CUSTOMER fora da UX administrativa', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({
      session: {
        user: { id: 'u1' },
        availableModes: ['OWNER', 'PROFESSIONAL', 'CUSTOMER'],
        businesses: [
          {
            id: 'b1',
            name: 'Spa',
            memberships: [
              { id: 'virtual-owner:b1', role: 'OWNER', locationIds: ['l1'], permissions: [], active: true },
            ],
          },
        ],
        customerProfile: { id: 'u1' },
        isPlatformAdmin: false,
        preferences: { activeMode: null, activeBusinessId: null },
      },
      isSessionLoading: false,
    })
  })

  it('seleção ambígua exibe modos administrativos, mas NÃO CUSTOMER', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorkspaceGate>{children}</WorkspaceGate>
      </MemoryRouter>,
    )
    expect(screen.getByText('Como você quer entrar?')).toBeTruthy()
    expect(screen.getByText('Gestão')).toBeTruthy()
    expect(screen.getByText('Profissional')).toBeTruthy()
    expect(screen.queryByText('Cliente')).toBeNull()
  })

  it('rotas /onboarding* nunca são cobertas pelo seletor (D8 precisa rodar nelas)', () => {
    render(
      <MemoryRouter initialEntries={['/onboarding/business']}>
        <WorkspaceGate>{children}</WorkspaceGate>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Como você quer entrar?')).toBeNull()
    expect(screen.getByTestId('content')).toBeTruthy()
  })
})

/* Platform admin bypass: isPlatformAdmin=true ignora needsSelection e modos vazios. */
describe('WorkspaceGate — platform admin bypass', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({
      session: {
        user: { id: 'admin-u1' },
        availableModes: [],
        businesses: [],
        customerProfile: null,
        isPlatformAdmin: true,
        preferences: { activeMode: null, activeBusinessId: null },
      },
      isSessionLoading: false,
    })
    useWorkspaceMock.mockReturnValue({
      activeMode: null,
      availableModes: [],
      businessesForMode: [],
      needsSelection: true,
      switchMode: vi.fn(),
      switchBusiness: vi.fn(),
    })
  })

  it('isPlatformAdmin=true passa direto sem exibir seletor', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <WorkspaceGate>{children}</WorkspaceGate>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Como você quer entrar?')).toBeNull()
    expect(screen.getByTestId('content')).toBeTruthy()
  })
})
