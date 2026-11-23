import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  register: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  authApi: { acceptInvite: mocks.acceptInvite },
}))
vi.mock('@/app/providers/auth', () => ({
  useAuth: () => ({ user: null, register: mocks.register, updateUser: vi.fn() }),
}))
vi.mock('@/app/providers/session', () => ({
  useSession: () => ({ refreshSession: vi.fn() }),
}))
vi.mock('@/lib/notify', () => ({
  notify: { success: mocks.notifySuccess, error: mocks.notifyError },
}))

import RegisterPage from './register'

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname}</output>
}

function mount() {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
      <CurrentPath />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.acceptInvite.mockResolvedValue({ membershipId: 'membership-1', userId: 'user-1' })
  mocks.register.mockResolvedValue({ autoVerified: false })
})
afterEach(cleanup)

describe('cadastro de funcionário na página de cadastro', () => {
  it('alterna o formulário sem sair de /register e aceita convite com conta nova', async () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Funcionário' }))

    expect(screen.getByTestId('path').textContent).toBe('/register')
    expect(screen.getByRole('heading', { name: 'Cadastro de funcionário' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'João Silva' } })
    fireEvent.change(screen.getByLabelText('E-mail do convite'), { target: { value: 'joao@example.com' } })
    fireEvent.change(screen.getByLabelText('Código do convite'), { target: { value: 'ab12cd' } })
    fireEvent.change(screen.getByLabelText('Criar senha'), { target: { value: 'Senha123' } })
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'Senha123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta e aceitar convite' }))

    await waitFor(() => expect(mocks.acceptInvite).toHaveBeenCalledWith(
      'joao@example.com',
      'AB12CD',
      'João Silva',
      'Senha123',
    ))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/login'))
  })

  it('aceita convite de conta existente sem mostrar campos de nova conta', async () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Funcionário' }))
    fireEvent.click(screen.getByLabelText('Já tenho uma conta'))

    expect(screen.queryByLabelText('Nome completo')).toBeNull()
    expect(screen.queryByLabelText('Criar senha')).toBeNull()
    expect(screen.queryByLabelText('Confirmar senha')).toBeNull()

    fireEvent.change(screen.getByLabelText('E-mail do convite'), { target: { value: 'joao@example.com' } })
    fireEvent.change(screen.getByLabelText('Código do convite'), { target: { value: 'ab12cd' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar convite' }))

    await waitFor(() => expect(mocks.acceptInvite).toHaveBeenCalledWith(
      'joao@example.com',
      'AB12CD',
      undefined,
      undefined,
    ))
  })
})
