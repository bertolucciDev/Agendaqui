import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { AppToaster } from '@/components/feedback/toaster'
import { extractErrorMessage, notify, FALLBACK_ERROR_MESSAGE } from './notify'

// jsdom does not implement matchMedia, which `react-hot-toast` relies on.
beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }
})

afterEach(() => {
  cleanup()
})

describe('extractErrorMessage', () => {
  it('prefers response.data.message when it is a string', () => {
    const error = { response: { data: { message: 'Falha na requisição' } } }
    expect(extractErrorMessage(error)).toBe('Falha na requisição')
  })

  it('joins validation messages arrays', () => {
    const error = { response: { data: { message: ['nome é obrigatório', 'e-mail inválido'] } } }
    expect(extractErrorMessage(error)).toBe('nome é obrigatório; e-mail inválido')
  })

  it('falls back to response.data.error', () => {
    const error = { response: { data: { error: 'Conflito' } } }
    expect(extractErrorMessage(error)).toBe('Conflito')
  })

  it('falls back to error.message', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('uses the generic fallback when nothing is available', () => {
    expect(extractErrorMessage({})).toBe(FALLBACK_ERROR_MESSAGE)
    expect(extractErrorMessage(undefined)).toBe(FALLBACK_ERROR_MESSAGE)
  })

  it('prefers the unwrapped payload when the response is still wrapped', () => {
    const error = { response: { data: { data: { message: 'Payload interno' } } } }
    expect(extractErrorMessage(error)).toBe('Payload interno')
  })
})

describe('notify', () => {
  it('shows a success toast with the message', async () => {
    render(<AppToaster />)
    notify.success('Serviço removido')
    expect(await screen.findByText('Serviço removido')).toBeTruthy()
  })

  it('shows an error toast built from an error object', async () => {
    render(<AppToaster />)
    notify.error({ response: { data: { message: 'E-mail já cadastrado' } } })
    expect(await screen.findByText('E-mail já cadastrado')).toBeTruthy()
  })

  it('renders a retry action on error toasts', async () => {
    render(<AppToaster />)
    notify.error('Falha ao salvar', { retry: () => {} })
    expect(await screen.findByText('Tentar novamente')).toBeTruthy()
  })

  it('returns the toast id so it can be dismissed', async () => {
    render(<AppToaster />)
    const id = notify.loading('Salvando...')
    expect(typeof id).toBe('string')
    await screen.findByText('Salvando...')
    notify.dismiss(id)
    await waitFor(() => expect(screen.queryByText('Salvando...')).toBeNull(), {
      timeout: 3000,
    })
  })
})
