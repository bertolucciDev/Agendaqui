import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Star } from 'lucide-react'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { supportApi } from '@/services/api/support'
import { TicketConversation } from '@/components/support/ticket-conversation'
import { connectSupportSocket } from '@/services/api/support-chat'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { loadNotificationPreferences } from '@/lib/notification-preferences'
import { notify } from '@/lib/notify'
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from '@/types/support'

type QueueFilters = {
  status?: SupportTicketStatus
  archiveStatus: 'ACTIVE' | 'ARCHIVED'
  category?: SupportTicketCategory
  priority?: SupportTicketPriority
  assignee?: string
}
const PAGE_SIZE = 20

export default function SupportDashboardPage() {
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<QueueFilters>({ archiveStatus: 'ACTIVE' })
  const [page, setPage] = useState(1)
  const queue = useQuery({
    queryKey: ['support-queue', filters, page],
    queryFn: () => supportApi.listQueue({ ...filters, page, limit: PAGE_SIZE }),
  })
  const queryClient = useQueryClient()
  const archiveMutation = useMutation({
    mutationFn: ({ ticketId, archived }: { ticketId: string; archived: boolean }) =>
      archived ? supportApi.restoreTicket(ticketId) : supportApi.archiveTicket(ticketId),
    onSuccess: (_ticket, variables) => {
      notify.success(variables.archived ? 'Chamado restaurado para a fila.' : 'Chamado arquivado.')
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    },
    onError: (error) => notify.error(error),
  })
  const notificationSound = useNotificationSound(loadNotificationPreferences().supportTicketSound)
  const requestedTicketId = searchParams.get('ticketId')

  useEffect(() => {
    setActiveTicketId(requestedTicketId)
  }, [requestedTicketId])

  function openTicket(ticketId: string) {
    setActiveTicketId(ticketId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('ticketId', ticketId)
    setSearchParams(nextParams)
  }

  function closeTicket() {
    setActiveTicketId(null)
    if (!searchParams.has('ticketId')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('ticketId')
    setSearchParams(nextParams)
  }

  function updateFilter<K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const socket = connectSupportSocket(token)
    socket.on('support:ticket-created', () => {
      notificationSound.play()
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    })
    socket.on('support:rating-submitted', () => {
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    })
    socket.on('support:ticket-updated', () => {
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    })
    return () => {
      socket.disconnect()
    }
  }, [notificationSound.play, queryClient])

  return (
    <>
      <PageHeader>
        <PageTitle>Central de suporte</PageTitle>
      </PageHeader>

      <PageContent className="mx-auto w-full max-w-4xl space-y-6">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chamados</h2>
            <p className="mt-1 text-sm text-muted-foreground">Solicitações abertas por clientes, profissionais e responsáveis por negócios.</p>
          </div>
          {queue.isError ? <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Não foi possível carregar os chamados.</p> : null}
          {queue.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <TicketCount label="Total" count={queue.data.counts.total} />
              <TicketCount label="Aguardando" count={queue.data.counts.OPEN} />
              <TicketCount label="Em atendimento" count={queue.data.counts.IN_PROGRESS} />
              <TicketCount label="Resolvidos" count={queue.data.counts.RESOLVED} />
              <TicketCount label="Encerrados" count={queue.data.counts.CLOSED} />
            </div>
          ) : null}
          <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Chamados</span>
              <select value={filters.archiveStatus} onChange={(event) => updateFilter('archiveStatus', event.target.value as QueueFilters['archiveStatus'])} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="ACTIVE">Ativos</option>
                <option value="ARCHIVED">Arquivados</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Status</span>
              <select value={filters.status ?? ''} onChange={(event) => updateFilter('status', (event.target.value || undefined) as SupportTicketStatus | undefined)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Todos</option>
                <option value="OPEN">Aguardando</option>
                <option value="IN_PROGRESS">Em atendimento</option>
                <option value="RESOLVED">Resolvidos</option>
                <option value="CLOSED">Encerrados</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Categoria</span>
              <select value={filters.category ?? ''} onChange={(event) => updateFilter('category', (event.target.value || undefined) as SupportTicketCategory | undefined)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Todas</option>
                {SUPPORT_TICKET_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Prioridade</span>
              <select value={filters.priority ?? ''} onChange={(event) => updateFilter('priority', (event.target.value || undefined) as SupportTicketPriority | undefined)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Todas</option>
                {SUPPORT_TICKET_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Responsável</span>
              <select value={filters.assignee ?? ''} onChange={(event) => updateFilter('assignee', event.target.value || undefined)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Todos</option>
                <option value="mine">Meus chamados</option>
                <option value="unassigned">Sem responsável</option>
                {queue.data?.supportAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
          </div>
          {queue.data ? (
            <section aria-labelledby="support-ranking-title" className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4">
                <h3 id="support-ranking-title" className="text-base font-semibold text-foreground">Ranking do suporte</h3>
                <p className="mt-1 text-sm text-muted-foreground">Média das avaliações recebidas pelos atendentes.</p>
              </div>
              {queue.data.ranking.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">O ranking aparecerá quando os clientes enviarem avaliações.</p>
              ) : (
                <ol className="space-y-2">
                  {queue.data.ranking.map((item, index) => (
                    <li key={item.supportUserId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                      <span className="w-7 text-center text-sm font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.name}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {item.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.total} {item.total === 1 ? 'avaliação' : 'avaliações'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}
          {queue.isPending ? <p className="text-sm text-muted-foreground">Carregando fila…</p> : null}
          {queue.data?.tickets.length === 0 ? <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">{queue.data.counts.total === 0 ? (filters.archiveStatus === 'ARCHIVED' ? 'Nenhum chamado arquivado.' : 'Nenhum chamado foi aberto ainda.') : 'Nenhum chamado corresponde a esses filtros.'}</p> : null}
          <div className="space-y-2">
            {queue.data?.tickets.map((ticket) => (
              <QueueTicket
                key={ticket.id}
                ticket={ticket}
                onOpen={() => openTicket(ticket.id)}
                onArchive={() => archiveMutation.mutate({ ticketId: ticket.id, archived: Boolean(ticket.archivedAt) })}
                archivePending={archiveMutation.isPending && archiveMutation.variables?.ticketId === ticket.id}
              />
            ))}
          </div>
          {queue.data && queue.data.total > 0 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{queue.data.total} chamado(s) • Página {page} de {Math.max(1, Math.ceil(queue.data.total / PAGE_SIZE))}</span>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline px-3 py-1.5 disabled:opacity-50" disabled={page <= 1 || queue.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
                <button type="button" className="btn btn-outline px-3 py-1.5 disabled:opacity-50" disabled={page >= Math.ceil(queue.data.total / PAGE_SIZE) || queue.isFetching} onClick={() => setPage((current) => current + 1)}>Próxima</button>
              </div>
            </div>
          ) : null}
        </section>

      </PageContent>
      {activeTicketId ? (
        <TicketConversation scope="support" ticketId={activeTicketId} onClose={closeTicket} />
      ) : null}
    </>
  )
}

function TicketCount({ label, count }: { label: string; count: number }) {
  return <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{count}</p></div>
}

function QueueTicket({
  ticket,
  onOpen,
  onArchive,
  archivePending,
}: {
  ticket: SupportTicket
  onOpen: () => void
  onArchive: () => void
  archivePending: boolean
}) {
  const status = ticket.status === 'OPEN' ? 'Aguardando' : ticket.status === 'IN_PROGRESS' ? 'Em atendimento' : ticket.status === 'RESOLVED' ? 'Resolvido' : 'Encerrado'
  const category = SUPPORT_TICKET_CATEGORIES.find((item) => item.value === ticket.category)?.label ?? 'Outros'
  const priority = SUPPORT_TICKET_PRIORITIES.find((item) => item.value === (ticket.priority ?? 'NORMAL'))?.label ?? 'Normal'
  const latest = ticket.conversation?.messages[0]
  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary/50">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-1 text-left">
        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{ticket.requester.name} · {ticket.requester.email}</p>
          {latest ? <p className="mt-1 truncate text-xs text-muted-foreground">{latest.sender.name}: {latest.body}</p> : null}
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{status}</span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{category}</span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{priority}</span>
        <span className="max-w-32 truncate text-xs text-muted-foreground">{ticket.assignee?.name ?? 'Sem responsável'}</span>
        <time className="text-xs text-muted-foreground" dateTime={ticket.updatedAt}>{new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}</time>
      </button>
      {ticket.status === 'CLOSED' ? (
        <button
          type="button"
          onClick={onArchive}
          disabled={archivePending}
          aria-label={ticket.archivedAt ? 'Restaurar chamado' : 'Arquivar chamado'}
          title={ticket.archivedAt ? 'Restaurar chamado' : 'Arquivar chamado'}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-50"
        >
          {ticket.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          <span className="hidden sm:inline">{ticket.archivedAt ? 'Restaurar' : 'Arquivar'}</span>
        </button>
      ) : null}
    </div>
  )
}
