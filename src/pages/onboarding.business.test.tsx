import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const createBusiness = vi.fn()
vi.mock('@/services/api/businesses', () => ({
  businessesApi: { create: (...args: unknown[]) => createBusiness(...args) },
}))
vi.mock('@/services/api/categories', () => ({
  categoriesApi: { list: vi.fn(async () => [{ id: 'cat_1', name: 'Barbearia', slug: 'barbearia' }]) },
}))
vi.mock('@/app/providers/session', () => ({
  useSession: () => ({
    session: {
      user: { id: 'u_new' },
      availableModes: ['CUSTOMER'],
      businesses: [],
      customerProfile: { id: 'u_new' },
      isPlatformAdmin: false,
      preferences: { activeMode: null, activeBusinessId: null },
    },
    isSessionLoading: false,
  }),
}))

import OnboardingBusinessPage from './onboarding.business'

/* FE-MVP-01 — testes 9–12: POST /businesses sucesso/409/erro + refresh da sessão. */

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="path">{loc.pathname}</div>
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OnboardingBusinessPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { invalidateSpy }
}

async function fillValidForm(type: 'cnpj' | 'cpf' = 'cnpj') {
  fireEvent.click(screen.getByTestId(type === 'cnpj' ? 'pick-cnpj' : 'pick-cpf'))
  const doc = type === 'cnpj' ? '04.252.011/0001-10' : '529.982.247-25'
  fireEvent.change(screen.getByPlaceholderText(type === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'), { target: { value: doc } })
  fireEvent.change(screen.getByPlaceholderText('Ex.: Barbearia do Zé'), { target: { value: 'Barbearia Teste' } })
  const select = await screen.findByRole('combobox')
  await waitFor(() => expect(screen.getByRole('option', { name: 'Barbearia' })).toBeTruthy())
  fireEvent.change(select, { target: { value: 'cat_1' } })
  fireEvent.change(screen.getByPlaceholderText('Rua, número, bairro, cidade - UF'), {
    target: { value: 'Rua X, 10 - Centro' },
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  createBusiness.mockResolvedValue({ id: 'biz_1' })
})
afterEach(() => cleanup())

describe('OnboardingBusinessPage (primeiro negócio)', () => {
  it('etapa 1: escolha CNPJ/CPF precede o formulário', () => {
    mount()
    expect(screen.getByText('Como seu negócio está registrado?')).toBeTruthy()
    fireEvent.click(screen.getByTestId('pick-cpf'))
    expect(screen.getByText('Primeiro negócio — CPF')).toBeTruthy()
  })

  it('9/12. sucesso: POST com dados unmasked + type correto, invalidate [session] aguardado e navega ao dashboard', async () => {
    const { invalidateSpy } = mount()
    await fillValidForm('cnpj')
    fireEvent.click(screen.getByRole('button', { name: /criar negócio/i }))

    await waitFor(() => expect(createBusiness).toHaveBeenCalledTimes(1))
    expect(createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'COMPANY',
        document: '04252011000110',
        name: 'Barbearia Teste',
        categoryId: 'cat_1',
        locationName: 'Principal',
        timezone: 'America/Sao_Paulo',
      }),
    )
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['session'] }))
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/dashboard'))
  })

  it('10. conflito 409 (documento duplicado) mostra erro no campo e não navega', async () => {
    const axiosErr = new AxiosError('Conflict', '409', undefined, undefined, {
      status: 409,
      data: { message: 'documento' },
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
    })
    createBusiness.mockRejectedValueOnce(axiosErr)
    mount()
    await fillValidForm('cnpj')
    fireEvent.click(screen.getByRole('button', { name: /criar negócio/i }))

    await waitFor(() =>
      expect(screen.getByText('Este documento já está cadastrado.')).toBeTruthy(),
    )
    expect(screen.getByTestId('path').textContent).toBe('/')
  })

  it('11. erro genérico (500/rede) mostra toast amigável sem detalhes internos', async () => {
    createBusiness.mockRejectedValueOnce(new Error('network down'))
    mount()
    await fillValidForm('cpf')
    fireEvent.click(screen.getByRole('button', { name: /criar negócio/i }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível criar o negócio agora. Tente novamente.'),
    )
  })

  it('documento inválido bloqueia o submit (zod) sem chamar a API', async () => {
    mount()
    fireEvent.click(screen.getByTestId('pick-cnpj'))
    fireEvent.change(screen.getByPlaceholderText('00.000.000/0000-00'), { target: { value: '11.111.111/1111-11' } })
    fireEvent.change(screen.getByPlaceholderText('Ex.: Barbearia do Zé'), { target: { value: 'X' } })
    const sel = await screen.findByRole('combobox')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Barbearia' })).toBeTruthy())
    fireEvent.change(sel, { target: { value: 'cat_1' } })
    fireEvent.change(screen.getByPlaceholderText('Rua, número, bairro, cidade - UF'), { target: { value: 'Rua X, 10' } })
    fireEvent.click(screen.getByRole('button', { name: /criar negócio/i }))

    await waitFor(() => screen.getByText('CNPJ inválido'))
    expect(createBusiness).not.toHaveBeenCalled()
  })
})
