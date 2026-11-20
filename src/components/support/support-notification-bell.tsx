import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supportApi } from '@/services/api/support'
import { connectSupportSocket } from '@/services/api/support-chat'

const NOTIFICATIONS_QUERY_KEY = ['support-notifications']

export function SupportNotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const notifications = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => supportApi.listQueue({ status: 'OPEN', page: 1, limit: 5 }),
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const socket = connectSupportSocket(token)
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    }
    socket.on('support:ticket-created', refresh)
    socket.on('support:ticket-updated', refresh)
    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const count = notifications.data?.counts.OPEN ?? 0

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Notificações de suporte: ${count} chamados aguardando`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-5 text-destructive-foreground">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section role="dialog" aria-label="Chamados aguardando atendimento" className="absolute right-0 top-12 z-50 w-[min(22rem,90vw)] overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-xl">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Chamados aguardando</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Selecione um chamado para abrir a conversa.</p>
          </header>
          {notifications.isPending ? <p role="status" className="px-4 py-5 text-sm text-muted-foreground">Carregando notificações...</p> : null}
          {notifications.isError ? <p role="alert" className="px-4 py-5 text-sm text-destructive">Não foi possível carregar os chamados.</p> : null}
          {notifications.data?.tickets.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum chamado aguardando atendimento.</p> : null}
          <ul className="max-h-80 overflow-y-auto p-2">
            {notifications.data?.tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    navigate(`/support?ticketId=${encodeURIComponent(ticket.id)}`)
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="block truncate text-sm font-medium">{ticket.subject}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{ticket.requester.name} · {ticket.requester.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
