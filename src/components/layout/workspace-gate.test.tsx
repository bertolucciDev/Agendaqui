import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/app/providers/session', () => ({
  useSession: () => ({
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
  }),
}))
vi.mock('@/app/providers/workspace', () => ({
  useWorkspace: () => ({
    activeMode: null,
    businessesForMode: [],
    needsSelection: true,
    switchMode: vi.fn(),
    switchBusiness: vi.fn(),
  }),
}))

import { WorkspaceGate } from './workspace-gate'
import type { ReactNode } from 'react'

const children: ReactNode = <div data-testid="content">app</div>

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

/* FE-MVP-01 — teste 13: CUSTOMER fora da seleção administrativa do MVP (contrato intocado). */
describe('WorkspaceGate — CUSTOMER fora da UX administrativa', () => {
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
