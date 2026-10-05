import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Regressão da integração: o backend emite códigos ALFANUMÉRICOS de 6
 * caracteres (alfabeto sem I/L/O/0/1) com verificação case-sensitive. A tela
 * aceitava apenas dígitos e não normalizava maiúsculas — um código gerado era
 * virtualmente impossível de digitar.
 */
vi.mock('@/services/api', () => ({
  authApi: { verifyEmail: vi.fn(async () => undefined) },
}))
vi.mock('@/app/providers/auth', () => ({
  useAuth: () => ({ user: null }),
}))

import VerifyEmailPage from './verify-email'

function mount() {
  render(
    <MemoryRouter initialEntries={['/verify-email?email=qa@exemplo.com']}>
      <VerifyEmailPage />
    </MemoryRouter>,
  )
}

function cells(): HTMLInputElement[] {
  return screen.getAllByRole('textbox') as HTMLInputElement[]
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

describe('verify-email — aceita código alfanumérico do backend', () => {
  it('digitação aceita letras E dígitos, normalizando para maiúsculas', () => {
    mount()
    const inputs = cells()
    inputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: 'qa7m2k'[i] } })
    })
    expect(inputs.map((i) => i.value).join('')).toBe('QA7M2K')
  })

  it('digitação rejeita símbolos e não quebra o estado', () => {
    mount()
    const inputs = cells()
    fireEvent.change(inputs[0], { target: { value: '-' } })
    expect(inputs[0].value).toBe('')
    fireEvent.change(inputs[0], { target: { value: 'k' } })
    expect(inputs[0].value).toBe('K')
  })

  it('colar aceita letras, sobe para maiúsculas e descarta o resto', () => {
    mount()
    const first = cells()[0]
    fireEvent.paste(first, { clipboardData: { getData: () => 'qa-7m2#k9' } })
    expect(cells().map((i) => i.value).join('')).toBe('QA7M2K')
  })
})
