import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { ConfirmDialog } from './confirm-dialog'
import { useConfirm } from './use-confirm'

afterEach(() => {
  cleanup()
})

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <ConfirmDialog
        open={open}
        title="Remover serviço?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => {
          onConfirm()
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

describe('ConfirmDialog', () => {
  it('exposes dialog semantics', () => {
    render(
      <ConfirmDialog
        open
        title="Remover serviço?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByText('Remover serviço?')).toBeTruthy()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeTruthy()
  })

  it('renders inside a portal on document.body', () => {
    render(
      <ConfirmDialog open title="Remover?" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy()
  })

  it('moves focus into the dialog and restores it on close', async () => {
    render(<Harness />)
    const trigger = screen.getByText('abrir')
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)

    await waitFor(() => {
      const dialog = screen.getByRole('dialog')
      expect(dialog.contains(document.activeElement)).toBe(true)
    })

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(document.activeElement).toBe(trigger)
    })
  })

  it('does not close while loading', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        loading
        title="Remover?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.keyDown(document.querySelector('[role="dialog"]') ?? document.body, {
      key: 'Escape',
    })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('closes on backdrop click', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="Remover?" onConfirm={() => {}} onCancel={onCancel} />)
    const overlay = document.querySelector('[role="dialog"]')?.parentElement
    expect(overlay).toBeTruthy()
    fireEvent.mouseDown(overlay as HTMLElement)
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('useConfirm', () => {
  it('resolves true when confirmed and false when cancelled', async () => {
    function Consumer({ result }: { result: (value: boolean) => void }) {
      const { confirm, confirmDialog } = useConfirm()
      return (
        <>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({ title: 'Remover?', variant: 'destructive' })
              result(ok)
            }}
          >
            perguntar
          </button>
          {confirmDialog}
        </>
      )
    }

    const onResult = vi.fn()
    render(<Consumer result={onResult} />)

    fireEvent.click(screen.getByText('perguntar'))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByText('Confirmar'))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true))

    fireEvent.click(screen.getByText('perguntar'))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByText('Cancelar'))
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false))
  })
})
