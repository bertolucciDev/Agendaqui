import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TicketConversationDialog } from './ticket-conversation-dialog'

afterEach(cleanup)

describe('TicketConversationDialog', () => {
  it('closes when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <TicketConversationDialog title="Chamado" onClose={onClose}>
        <button type="button">Ação</button>
      </TicketConversationDialog>
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('returns focus to the first control after the last select', () => {
    render(
      <TicketConversationDialog title="Chamado" onClose={() => {}}>
        <button type="button">Ação</button>
        <button type="button">Última ação</button>
        <select aria-label="Categoria">
          <option>Conta</option>
        </select>
      </TicketConversationDialog>
    )

    const select = screen.getByRole('combobox', { name: 'Categoria' })
    select.focus()
    fireEvent.keyDown(select, { key: 'Tab' })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fechar conversa' }))
  })
})
