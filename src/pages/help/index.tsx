import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy, Plus } from 'lucide-react'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { Input } from '@/components/ui/input'
import { supportApi } from '@/services/api/support'
import { TicketConversation } from '@/components/support/ticket-conversation'
import { SUPPORT_TICKET_CATEGORIES, type SupportTicket, type SupportTicketCategory } from '@/types/support'

export default function HelpPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>('OTHER')
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const ticketsQuery = useQuery({ queryKey: ['my-support-tickets'], queryFn: supportApi.listMyTickets })
  const create = useMutation({
    mutationFn: () => supportApi.createTicket({ subject: subject.trim(), message: message.trim(), category }),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
      setActiveTicketId(ticket.id)
      setSubject('')
      setMessage('')
      setCategory('OTHER')
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (subject.trim() && message.trim()) create.mutate()
  }

  return (
    <>
      <PageHeader><PageTitle>Ajuda e suporte</PageTitle></PageHeader>
      <PageContent className="mx-auto w-full max-w-4xl space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Abrir um chamado</h2>
          <p className="mt-1 text-sm text-muted-foreground">Conte o que aconteceu. Você poderá conversar com o suporte assim que alguém aceitar a solicitação.</p>
          <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-5">
            <div>
              <label htmlFor="help-category" className="mb-2 block text-sm font-medium text-foreground">Categoria</label>
              <select
                id="help-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {SUPPORT_TICKET_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="help-subject" className="mb-2 block text-sm font-medium text-foreground">Assunto</label>
              <Input id="help-subject" required minLength={4} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex.: Não consigo confirmar um agendamento" />
            </div>
            <div>
              <label htmlFor="help-message" className="mb-2 block text-sm font-medium text-foreground">Descreva o problema</label>
              <textarea id="help-message" required maxLength={4000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" placeholder="Inclua os detalhes que ajudam a entender sua solicitação." />
            </div>
            {create.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível abrir o chamado. Tente novamente.</p> : null}
            <button type="submit" disabled={!subject.trim() || !message.trim() || create.isPending} className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <Plus className="h-4 w-4" /> {create.isPending ? 'Enviando…' : 'Enviar chamado'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Meus chamados</h2>
          {ticketsQuery.isPending ? <p className="mt-3 text-sm text-muted-foreground">Carregando chamados…</p> : null}
          {ticketsQuery.isError ? <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível carregar seus chamados.</p> : null}
          {ticketsQuery.data?.length === 0 ? <p className="mt-3 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p> : null}
          <div className="mt-3 space-y-2">
            {ticketsQuery.data?.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onOpen={() => setActiveTicketId(ticket.id)} />)}
          </div>
        </section>
      </PageContent>
      {activeTicketId ? (
        <TicketConversation scope="help" ticketId={activeTicketId} onClose={() => setActiveTicketId(null)} />
      ) : null}
    </>
  )
}

function TicketRow({ ticket, onOpen }: { ticket: SupportTicket; onOpen: () => void }) {
  const label = ticket.status === 'OPEN' ? 'Aguardando' : ticket.status === 'IN_PROGRESS' ? 'Em atendimento' : ticket.status === 'RESOLVED' ? 'Resolvido' : 'Encerrado'
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary/50">
      <LifeBuoy className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
        <p className="text-xs text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}</p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{label}</span>
    </button>
  )
}
