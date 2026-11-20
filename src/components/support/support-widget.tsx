import { useId, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy, MessageCircle, Plus, X } from 'lucide-react'
import { TicketConversation } from '@/components/support/ticket-conversation'
import { Input } from '@/components/ui/input'
import { supportApi } from '@/services/api/support'
import type { SupportTicket } from '@/types/support'
import { SUPPORT_TICKET_CATEGORIES, type SupportTicketCategory } from '@/types/support'

const STATUS_LABEL: Record<SupportTicket['status'], string> = {
  OPEN: 'Aguardando suporte',
  IN_PROGRESS: 'Em atendimento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Encerrado',
}

export function SupportWidget() {
  const titleId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTicket, setActiveTicket] = useState<{ id: string; subject: string } | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>('OTHER')
  const queryClient = useQueryClient()
  const ticketsQuery = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: supportApi.listMyTickets,
    enabled: isOpen,
  })

  const createTicket = useMutation({
    mutationFn: () => supportApi.createTicket({ subject: subject.trim(), message: message.trim(), category }),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
      setSubject('')
      setMessage('')
      setCategory('OTHER')
      setIsCreating(false)
      setActiveTicket({ id: ticket.id, subject: ticket.subject })
    },
  })

  function closeWidget() {
    setIsOpen(false)
    setActiveTicket(null)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (subject.trim() && message.trim() && !createTicket.isPending) createTicket.mutate()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Abrir ajuda e suporte"
      >
        <LifeBuoy className="h-4 w-4" />
        Ajuda
      </button>

      {isOpen && typeof document !== 'undefined' ? createPortal(
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeWidget()
          }}
          className="fixed bottom-24 right-5 z-50 flex max-h-[min(76dvh,42rem)] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <LifeBuoy className="h-4 w-4" />
              </span>
              <h2 id={titleId} className="truncate text-sm font-semibold">{activeTicket?.subject ?? 'Ajuda e suporte'}</h2>
            </div>
            <button
              type="button"
              onClick={closeWidget}
              aria-label="Fechar ajuda"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeTicket ? (
              <TicketConversation
                scope="help"
                ticketId={activeTicket.id}
                embedded
                onBack={() => setActiveTicket(null)}
              />
            ) : (
            <div className="space-y-5">
              <section className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">Como podemos ajudar?</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Abra um chamado e acompanhe a conversa com o suporte por aqui.</p>
                    {!isCreating ? (
                      <button type="button" onClick={() => setIsCreating(true)} className="btn btn-primary mt-3 inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Novo chamado
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              {isCreating ? (
                <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-background p-4">
                  <div>
                    <label htmlFor="support-widget-category" className="mb-2 block text-sm font-medium text-foreground">Categoria</label>
                    <select
                      id="support-widget-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {SUPPORT_TICKET_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="support-widget-subject" className="mb-2 block text-sm font-medium text-foreground">Assunto</label>
                    <Input id="support-widget-subject" required minLength={4} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: Problema no agendamento" />
                  </div>
                  <div>
                    <label htmlFor="support-widget-message" className="mb-2 block text-sm font-medium text-foreground">Mensagem</label>
                    <textarea id="support-widget-message" required maxLength={4000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" placeholder="Descreva como podemos ajudar." />
                  </div>
                  {createTicket.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível abrir o chamado. Tente novamente.</p> : null}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsCreating(false)} className="btn btn-outline">Cancelar</button>
                    <button type="submit" disabled={!subject.trim() || !message.trim() || createTicket.isPending} className="btn btn-primary disabled:opacity-50">
                      {createTicket.isPending ? 'Enviando…' : 'Enviar chamado'}
                    </button>
                  </div>
                </form>
              ) : null}

              <section aria-labelledby="support-widget-tickets-title">
                <h3 id="support-widget-tickets-title" className="mb-2 text-sm font-semibold text-foreground">Suas conversas</h3>
                {ticketsQuery.isPending ? <p className="py-3 text-sm text-muted-foreground">Carregando conversas…</p> : null}
                {ticketsQuery.isError ? <p role="alert" className="py-3 text-sm text-destructive">Não foi possível carregar os chamados.</p> : null}
                {ticketsQuery.data?.length === 0 ? <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">Você ainda não tem chamados.</p> : null}
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {ticketsQuery.data?.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setActiveTicket({ id: ticket.id, subject: ticket.subject })}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-background"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{ticket.subject}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{STATUS_LABEL[ticket.status]}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            )}
          </div>
        </section>,
        document.body,
      ) : null}
    </>
  )
}
