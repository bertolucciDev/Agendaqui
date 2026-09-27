import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const updatePreferences = vi.fn()
vi.mock('@/services/api/session', () => ({
  sessionApi: {
    getSession: vi.fn(),
    updatePreferences: (...args: unknown[]) => updatePreferences(...args),
  },
}))

const fakeSession = {
  user: { id: 'u_t' },
  availableModes: ['OWNER', 'PROFESSIONAL'],
  businesses: [
    {
      id: 'b1',
      name: 'Spa',
      memberships: [
        { id: 'virtual-owner:b1', role: 'OWNER', locationIds: ['l1'], permissions: ['business:manage'], active: true },
      ],
    },
    {
      id: 'b2',
      name: 'Bar',
      memberships: [
        { id: 'mem_9', role: 'EMPLOYEE', locationIds: ['l2'], permissions: ['appointments:read'], active: true },
      ],
    },
  ],
  customerProfile: null,
  isPlatformAdmin: false,
  preferences: { activeMode: null, activeBusinessId: null },
}

vi.mock('./session', () => ({
  useSession: () => ({ session: fakeSession, isSessionLoading: false, refreshSession: vi.fn() }),
}))

import { WorkspaceProvider, useWorkspace } from './workspace'

/* FE-API-01 #3 — switchMode/switchBusiness: estado local imediato + PATCH fire-and-forget;
 * falha de persistência nunca corrompe o contexto local. */

function Probe() {
  const w = useWorkspace()
  return (
    <div>
      <span data-testid="mode">{w.activeMode ?? 'null'}</span>
      <span data-testid="biz">{w.activeBusiness?.id ?? 'null'}</span>
      <button data-testid="to-owner" onClick={() => w.switchMode('OWNER')} />
      <button data-testid="to-pro" onClick={() => w.switchMode('PROFESSIONAL')} />
      <button data-testid="to-customer" onClick={() => w.switchMode('CUSTOMER')} />
      <button data-testid="biz-b1" onClick={() => w.switchBusiness('b1')} />
      <button data-testid="biz-b2" onClick={() => w.switchBusiness('b2')} />
    </div>
  )
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </QueryClientProvider>
  )
  return render(<Probe />, { wrapper: wrap })
}

beforeEach(() => {
  localStorage.clear()
  updatePreferences.mockReset()
  updatePreferences.mockResolvedValue({ activeMode: null, activeBusinessId: null })
})

afterEach(() => cleanup())

describe('WorkspaceProvider — persistência de preferences', () => {
  it('switchMode: estado local muda imediatamente E dispara PATCH correto', async () => {
    mount()
    act(() => screen.getByTestId('to-owner').click())

    // imediato (sem round-trip):
    expect(screen.getByTestId('mode').textContent).toBe('OWNER')
    expect(screen.getByTestId('biz').textContent).toBe('b1')
    expect(updatePreferences).toHaveBeenCalledTimes(1)
    expect(updatePreferences).toHaveBeenCalledWith({ activeMode: 'OWNER', activeBusinessId: null })
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledTimes(1)) // sem refetch em cadeia
  })

  it('switchBusiness: PATCH parcial com apenas activeBusinessId', () => {
    mount()
    act(() => screen.getByTestId('to-owner').click())
    act(() => screen.getByTestId('biz-b1').click())

    expect(updatePreferences).toHaveBeenLastCalledWith({ activeBusinessId: 'b1' })
    expect(screen.getByTestId('biz').textContent).toBe('b1')
  })

  it('switch para PROFESSIONAL limpa business incompatível também no PATCH', () => {
    mount()
    act(() => screen.getByTestId('to-owner').click())
    act(() => screen.getByTestId('to-pro').click())

    expect(updatePreferences).toHaveBeenLastCalledWith({ activeMode: 'PROFESSIONAL', activeBusinessId: null })
    expect(screen.getByTestId('mode').textContent).toBe('PROFESSIONAL')
    expect(screen.getByTestId('biz').textContent).toBe('b2') // resolvido por escolha única do catálogo
  })

  it('falha de PATCH não corrompe o contexto local', async () => {
    updatePreferences.mockRejectedValueOnce(new Error('network down'))
    mount()
    act(() => screen.getByTestId('to-owner').click())

    expect(screen.getByTestId('mode').textContent).toBe('OWNER')
    expect(screen.getByTestId('biz').textContent).toBe('b1')
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('agendaqui:workspace')!).activeMode).toBe('OWNER'),
    )
    expect(screen.getByTestId('mode').textContent).toBe('OWNER')
  })

  it('guardas intactos: modo fora do catálogo não dispara PATCH nem muda estado', () => {
    mount()
    updatePreferences.mockClear()
    const w0 = screen.getByTestId('mode').textContent
    act(() => screen.getByTestId('to-customer').click()) // 'CUSTOMER' não está em availableModes
    expect(screen.getByTestId('mode').textContent).toBe(w0)
    expect(updatePreferences).not.toHaveBeenCalled()
  })
})
