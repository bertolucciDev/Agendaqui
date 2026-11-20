import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { DocumentPreviewDialog } from './document-preview-dialog'
import { adminApi } from '@/services/api/admin'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const CONTENT_URL = '/me/admin/business-verifications/vid-1/documents/doc-1/content'

function renderDialog(overrides: Partial<React.ComponentProps<typeof DocumentPreviewDialog>> = {}) {
  const onClose = vi.fn()
  render(
    <DocumentPreviewDialog
      open
      contentUrl={CONTENT_URL}
      title="CPF — frente"
      mimeType="image/jpeg"
      sizeBytes={2_345_750}
      fileName="cpf-frente-v1"
      onClose={onClose}
      {...overrides}
    />,
  )
  return { onClose }
}

describe('DocumentPreviewDialog', () => {
  beforeEach(() => {
    // jsdom não implementa object URL nem o load de <img>.
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
  })

  it('expõe a semântica de diálogo acessível', async () => {
    renderDialog()

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByText('CPF — frente')).toBeTruthy()
    // MIME e tamanho no cabeçalho.
    expect(screen.getByText(/image\/jpeg/)).toBeTruthy()
    expect(screen.getByText(/KB/)).toBeTruthy()
  })

  it('renderiza dentro de um portal no document.body', () => {
    renderDialog()
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('busca o documento autenticado e mostra a imagem', async () => {
    const spy = vi
      .spyOn(adminApi, 'getDocumentContent')
      .mockResolvedValue(new Blob(['fake-jpeg'], { type: 'image/jpeg' }))

    renderDialog()

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(CONTENT_URL, expect.anything())
    })

    // A imagem renderiza com a object URL criada a partir do blob.
    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'CPF — frente' })
      expect(img.getAttribute('src')).toBe('blob:mock')
    })
  })

  it('mostra o estado de carregamento antes do conteúdo', () => {
    vi.spyOn(adminApi, 'getDocumentContent').mockImplementation(
      () => new Promise(() => {}),
    )

    renderDialog()

    // Sem o texto de erro e sem imagem ainda.
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.queryByText(/Não foi possível carregar/)).toBeNull()
  })

  it('mostra a mensagem de erro e permite tentar de novo', async () => {
    const spy = vi.spyOn(adminApi, 'getDocumentContent').mockRejectedValue(
      new Error('Falhou'),
    )

    renderDialog()

    // `getApiErrorMessage` prioriza a mensagem do próprio erro sobre o fallback.
    await waitFor(() => {
      expect(screen.getByText('Falhou')).toBeTruthy()
    })

    const retry = screen.getByText('Tentar novamente')
    fireEvent.click(retry)

    await waitFor(() => {
      expect(spy.mock.calls.length).toBeGreaterThan(1)
    })
  })

  it('usa o fallback quando o erro não traz mensagem', async () => {
    vi.spyOn(adminApi, 'getDocumentContent').mockRejectedValue({
      response: { status: 500, data: {} },
    })

    renderDialog()

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível carregar o documento/),
      ).toBeTruthy()
    })
  })

  it('fecha pelo botão, pelo backdrop e pelo Escape', async () => {
    const { onClose } = renderDialog()

    fireEvent.click(screen.getByLabelText('Fechar preview'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('oferece download do documento carregado', async () => {
    vi.spyOn(adminApi, 'getDocumentContent').mockResolvedValue(
      new Blob(['fake-jpeg'], { type: 'image/jpeg' }),
    )

    renderDialog()

    await waitFor(() => {
      const link = document.querySelector('a[download]') as HTMLAnchorElement | null
      expect(link).toBeTruthy()
      expect(link?.getAttribute('download')).toBe('cpf-frente-v1')
      expect(link?.getAttribute('href')).toBe('blob:mock')
    })
  })

  it('usa iframe para PDF', async () => {
    vi.spyOn(adminApi, 'getDocumentContent').mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' }),
    )

    renderDialog({ mimeType: 'application/pdf' })

    await waitFor(() => {
      const frame = document.querySelector('iframe') as HTMLIFrameElement | null
      expect(frame).toBeTruthy()
      expect(frame?.getAttribute('src')).toBe('blob:mock')
    })
  })
})
