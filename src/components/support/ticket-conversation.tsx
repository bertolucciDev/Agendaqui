import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowLeft, Check, LifeBuoy, Send, Star } from 'lucide-react'
import { useAuth } from '@/app/providers/auth'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { Input } from '@/components/ui/input'
import { TicketConversationDialog } from '@/components/support/ticket-conversation-dialog'
import { supportApi } from '@/services/api/support'
import { connectSupportSocket } from '@/services/api/support-chat'
import {
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  type SupportMessage,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketNote,
  type SupportTicketPriority,
} from '@/types/support'

const QUICK_REPLIES = [
  'Olá! Como podemos ajudar?',
  'Estamos analisando seu chamado e retornaremos em breve.',
  'Conseguimos resolver sua solicitação?',
  'Obrigado por entrar em contato com o Agendaqui.',
]
const RATING_PROMPT = 'Atendimento finalizado. Como você avalia o atendimento? Escolha uma nota de 1 a 5.'
const RATING_PREFIX = 'Nota do atendimento: '

function statusLabel(status: SupportTicket['status']) {
  return {
    OPEN: 'Aguardando suporte',
    IN_PROGRESS: 'Em atendimento',
    RESOLVED: 'Resolvido',
    CLOSED: 'Encerrado',
  }[status]
}

function acceptanceErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { message?: unknown } | undefined
    const message = payload?.message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join(' ')
    if (error.response?.status === 403) return 'Sua conta não tem permissão para aceitar chamados de suporte.'
    if (error.response?.status === 409) return 'Este chamado já foi aceito por outra pessoa ou não está mais aberto. Atualize a fila e tente outro chamado.'
    if (error.response?.status) return `O servidor recusou o aceite (HTTP ${error.response.status}). Tente novamente.`
    return 'Não foi possível alcançar o servidor. Verifique a conexão e tente novamente.'
  }
  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível aceitar o chamado. Tente novamente.'
}

export function TicketConversation({
  scope,
  ticketId: ticketIdProp,
  onClose,
  embedded = false,
  onBack,
}: {
  scope: 'help' | 'support'
  ticketId?: string
  onClose?: () => void
  embedded?: boolean
  onBack?: () => void
}) {
  const { ticketId: routeTicketId = '' } = useParams()
  const ticketId = ticketIdProp ?? routeTicketId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [selectedRating, setSelectedRating] = useState(0)
  const [internalNoteBody, setInternalNoteBody] = useState('')
  const [nextAssigneeId, setNextAssigneeId] = useState('')
  const [ratingError, setRatingError] = useState('')
  const [isLive, setIsLive] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const ticketKey = useMemo(() => ['support-ticket', scope, ticketId] as const, [scope, ticketId])
  const messageKey = useMemo(() => ['support-ticket-messages', scope, ticketId] as const, [scope, ticketId])
  const notesKey = useMemo(() => ['support-ticket-notes', ticketId] as const, [ticketId])
  const ticketQuery = useQuery({
    queryKey: ticketKey,
    queryFn: () => scope === 'help' ? supportApi.getMyTicket(ticketId) : supportApi.getQueueTicket(ticketId),
    enabled: !!ticketId,
  })
  const notesQuery = useQuery({
    queryKey: notesKey,
    queryFn: () => supportApi.listInternalNotes(ticketId),
    enabled: scope === 'support' && !!ticketId,
  })
  const agentsQuery = useQuery({
    queryKey: ['support-agents'],
    queryFn: supportApi.listSupportAgents,
    enabled: scope === 'support',
  })
  const messagesQuery = useQuery({
    queryKey: messageKey,
    queryFn: () => supportApi.listMessages(ticketId, scope),
    enabled: !!ticketId && ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(ticketQuery.data?.status ?? ''),
  })
  const ticketStatus = ticketQuery.data?.status

  const send = useMutation({
    mutationFn: () => supportApi.sendMessage(ticketId, scope, body.trim()),
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: messageKey })
      void queryClient.invalidateQueries({ queryKey: ticketKey })
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    },
  })
  const accept = useMutation({
    mutationFn: () => supportApi.acceptTicket(ticketId),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKey, ticket)
      void queryClient.invalidateQueries({ queryKey: messageKey })
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    },
  })
  const classify = useMutation({
    mutationFn: (input: { category?: SupportTicketCategory; priority?: SupportTicketPriority }) =>
      supportApi.updateTicketClassification(ticketId, input),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKey, ticket)
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    },
  })
  const createNote = useMutation({
    mutationFn: () => supportApi.createInternalNote(ticketId, internalNoteBody.trim()),
    onSuccess: (note) => {
      setInternalNoteBody('')
      queryClient.setQueryData<SupportTicketNote[]>(notesKey, (current = []) =>
        current.some((item) => item.id === note.id) ? current : [...current, note],
      )
    },
  })
  const transfer = useMutation({
    mutationFn: () => supportApi.transferTicket(ticketId, nextAssigneeId),
    onSuccess: (ticket) => {
      setNextAssigneeId('')
      queryClient.setQueryData(ticketKey, ticket)
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    },
  })
  const finalize = useMutation({
    mutationFn: () => supportApi.finalizeTicket(ticketId),
    onSuccess: (ticket) => {
      queryClient.setQueryData(ticketKey, ticket)
      void queryClient.invalidateQueries({ queryKey: messageKey })
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
    },
  })
  const rate = useMutation({
    mutationFn: (score: number) => supportApi.rateTicket(ticketId, score),
    onSuccess: ({ rating, message }) => {
      setRatingError('')
      queryClient.setQueryData<SupportMessage[]>(messageKey, (current = []) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      )
      queryClient.setQueryData<SupportTicket | undefined>(ticketKey, (current) => current ? ({
        ...current,
        status: 'CLOSED',
        closedAt: rating.createdAt,
        rating,
      }) : current)
      void queryClient.invalidateQueries({ queryKey: ticketKey })
      void queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
    },
    onError: () => setRatingError('Não foi possível enviar sua avaliação. Tente novamente.'),
  })

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || !ticketId) {
      setIsLive(false)
      return
    }

    const socket = connectSupportSocket(token)

    socket.on('connect', () => {
      setIsLive(true)
      socket.emit('ticket:join', { ticketId }, (result: { ok: boolean }) => {
        if (!result?.ok) return
      })
    })
    socket.on('disconnect', () => setIsLive(false))
    socket.on('connect_error', () => setIsLive(false))
    socket.on('ticket:message', (_message: SupportMessage) => {
      void queryClient.invalidateQueries({ queryKey: messageKey })
      void queryClient.invalidateQueries({ queryKey: ticketKey })
    })
    socket.on('ticket:accepted', () => {
      void queryClient.invalidateQueries({ queryKey: ticketKey })
      void queryClient.invalidateQueries({ queryKey: messageKey })
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    })
    socket.on('ticket:assignee-updated', () => {
      void queryClient.invalidateQueries({ queryKey: ticketKey })
      void queryClient.invalidateQueries({ queryKey: ['support-queue'] })
    })
    socket.on('support:ticket-updated', (event: { ticketId: string }) => {
      if (scope === 'support' && event.ticketId === ticketId) {
        void queryClient.invalidateQueries({ queryKey: ticketKey })
      }
    })
    socket.on('support:ticket-note-created', (event: { ticketId: string }) => {
      if (scope === 'support' && event.ticketId === ticketId) {
        void queryClient.invalidateQueries({ queryKey: notesKey })
      }
    })
    return () => {
      socket.disconnect()
    }
  }, [messageKey, notesKey, queryClient, scope, ticketId, ticketKey, ticketStatus])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (body.trim() && !send.isPending) send.mutate()
  }

  function submitInternalNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (internalNoteBody.trim() && !createNote.isPending) createNote.mutate()
  }

  if (ticketQuery.isPending) {
    const content = <p className="text-sm text-muted-foreground">Carregando chamado…</p>
    return onClose
      ? <TicketConversationDialog title="Carregando chamado" onClose={onClose}>{content}</TicketConversationDialog>
      : embedded ? content
      : <PageContent>{content}</PageContent>
  }
  if (ticketQuery.isError || !ticketQuery.data) {
    const content = <p role="alert" className="text-sm text-destructive">Não foi possível carregar este chamado.</p>
    return onClose
      ? <TicketConversationDialog title="Erro ao abrir chamado" onClose={onClose}>{content}</TicketConversationDialog>
      : embedded ? content
      : <PageContent>{content}</PageContent>
  }

  const ticket = ticketQuery.data
  const isCurrentAssignee = scope === 'support' && ticket.status === 'IN_PROGRESS' && ticket.assignedSupportUserId === user?.id
  const messages = messagesQuery.data ?? ticket.conversation?.messages ?? []
  const canChat = ticket.status === 'IN_PROGRESS'
  const ratingPrompt = messages.some((message) => message.body === RATING_PROMPT)
  const legacyRatingMessage = messages.find((message) => message.body.startsWith(RATING_PREFIX) && message.senderUserId === ticket.requesterUserId)
  const legacyRatingScore = legacyRatingMessage?.body.match(/^Nota do atendimento: ([1-5])\/5$/)?.[1]
  const savedRating = ticket.rating?.score ?? (legacyRatingScore ? Number(legacyRatingScore) : null)
  const otherName = scope === 'support' ? ticket.requester.name : (ticket.assignee?.name ?? 'Equipe Agendaqui')

  const content = (
    <div className="space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{statusLabel(ticket.status)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scope === 'support' ? `${ticket.requester.name} · ${ticket.requester.email}` : `Atendimento com ${otherName}`}
            </p>
            {scope === 'support' ? <p className="mt-1 text-xs text-muted-foreground">Responsável: {ticket.assignee?.name ?? 'Sem responsável'}</p> : null}
          </div>
          {scope === 'support' && ticket.status === 'OPEN' ? (
            <button type="button" onClick={() => accept.mutate()} disabled={accept.isPending} className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              <Check className="h-4 w-4" /> {accept.isPending ? 'Aceitando…' : 'Aceitar chamado'}
            </button>
          ) : null}
          {scope === 'support' && ticket.status === 'IN_PROGRESS' ? (
            <button type="button" onClick={() => finalize.mutate()} disabled={finalize.isPending} className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              <Check className="h-4 w-4" /> {finalize.isPending ? 'Finalizando…' : 'Finalizar chamado'}
            </button>
          ) : null}
        </section>

        {scope === 'support' ? (
          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Categoria</span>
              <select
                value={ticket.category}
                disabled={classify.isPending}
                onChange={(event) => classify.mutate({ category: event.target.value as SupportTicketCategory })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              >
                {SUPPORT_TICKET_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>Prioridade interna</span>
              <select
                value={ticket.priority ?? 'NORMAL'}
                disabled={classify.isPending}
                onChange={(event) => classify.mutate({ priority: event.target.value as SupportTicketPriority })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
              >
                {SUPPORT_TICKET_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {classify.isError ? <p role="alert" className="text-sm text-destructive sm:col-span-2">Não foi possível atualizar a classificação. Tente novamente.</p> : null}
          </section>
        ) : null}

        {scope === 'support' ? (
          <section aria-labelledby="support-internal-notes-title" className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div>
              <h3 id="support-internal-notes-title" className="text-sm font-semibold text-foreground">Notas internas · só suporte</h3>
              <p className="mt-1 text-xs text-muted-foreground">Essas notas não aparecem para o cliente.</p>
            </div>
            {notesQuery.isPending ? <p className="text-sm text-muted-foreground">Carregando notas…</p> : null}
            {notesQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar as notas internas.</p> : null}
            {notesQuery.data?.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma nota interna ainda.</p> : null}
            {notesQuery.data?.length ? (
              <ol className="max-h-48 space-y-2 overflow-y-auto">
                {notesQuery.data.map((note) => (
                  <li key={note.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">{note.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{note.author.name} · {new Date(note.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </li>
                ))}
              </ol>
            ) : null}
            {isCurrentAssignee ? (
              <form onSubmit={submitInternalNote} className="space-y-2 border-t border-border pt-3">
                <label htmlFor="support-internal-note" className="block text-sm font-medium text-foreground">Adicionar nota privada</label>
                <textarea
                  id="support-internal-note"
                  value={internalNoteBody}
                  onChange={(event) => setInternalNoteBody(event.target.value)}
                  maxLength={4000}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="Registre informações para a equipe de suporte."
                />
                {createNote.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível salvar a nota. Tente novamente.</p> : null}
                <div className="flex justify-end">
                  <button type="submit" disabled={!internalNoteBody.trim() || createNote.isPending} className="btn btn-outline disabled:opacity-50">
                    {createNote.isPending ? 'Salvando…' : 'Salvar nota interna'}
                  </button>
                </div>
              </form>
            ) : null}
            {isCurrentAssignee ? (
              <div className="space-y-2 border-t border-border pt-3">
                <label htmlFor="support-ticket-transfer" className="block text-sm font-medium text-foreground">Transferir para outro atendente</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    id="support-ticket-transfer"
                    value={nextAssigneeId}
                    disabled={agentsQuery.isPending || transfer.isPending}
                    onChange={(event) => setNextAssigneeId(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                  >
                    <option value="">Selecione um atendente</option>
                    {agentsQuery.data?.filter((agent) => agent.id !== user?.id).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                  </select>
                  <button type="button" onClick={() => transfer.mutate()} disabled={!nextAssigneeId || transfer.isPending} className="btn btn-outline disabled:opacity-50">
                    {transfer.isPending ? 'Transferindo…' : 'Transferir chamado'}
                  </button>
                </div>
                {agentsQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar a equipe de suporte.</p> : null}
                {transfer.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível transferir o chamado. Atualize a tela e tente novamente.</p> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {accept.isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p>{acceptanceErrorMessage(accept.error)}</p>
            <button type="button" onClick={() => accept.mutate()} disabled={accept.isPending} className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-50">
              Tentar novamente
            </button>
          </div>
        ) : null}
        {finalize.isError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p>{acceptanceErrorMessage(finalize.error)}</p>
            <button type="button" onClick={() => finalize.mutate()} disabled={finalize.isPending} className="shrink-0 font-semibold underline underline-offset-2">Tentar novamente</button>
          </div>
        ) : null}

        <section aria-label="Conversa do chamado" className="flex min-h-[26rem] flex-col overflow-hidden rounded-xl border border-border bg-surface">
          {!canChat && !['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} mine={message.senderUserId === user?.id} />
                ))}
              </div>
              <div className="flex flex-col items-center justify-center gap-3 border-t border-border p-8 text-center">
                <LifeBuoy className="h-9 w-9 text-primary" />
                <p className="font-semibold text-foreground">A conversa começa quando o suporte aceitar</p>
                <p className="max-w-md text-sm text-muted-foreground">Sua solicitação foi registrada. As mensagens serão liberadas assim que um atendente assumir o chamado.</p>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground" aria-live="polite">
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isLive ? 'Conectado em tempo real' : 'Reconectando ao chat…'}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesQuery.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar as mensagens.</p> : null}
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} mine={message.senderUserId === user?.id} />
                ))}
                <div ref={bottomRef} />
              </div>
              {canChat && scope === 'support' ? (
                <div className="flex flex-wrap gap-2 border-t border-border px-3 pt-3">
                  {QUICK_REPLIES.map((reply) => (
                    <button key={reply} type="button" onClick={() => setBody(reply)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                      {reply}
                    </button>
                  ))}
                </div>
              ) : null}
              {canChat ? <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
                <Input aria-label="Mensagem" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Escreva sua mensagem…" />
                <button type="submit" disabled={!body.trim() || send.isPending} aria-label="Enviar mensagem" className="btn btn-primary shrink-0 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form> : null}
              {scope === 'help' && ticket.status === 'RESOLVED' && ratingPrompt && !savedRating ? (
                <div className="border-t border-border p-4 text-center">
                  <p className="mb-3 text-sm font-medium">Como foi seu atendimento?</p>
                  <div className="flex justify-center gap-2" aria-label="Avalie de 1 a 5 estrelas">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button key={score} type="button" onClick={() => setSelectedRating(score)} disabled={rate.isPending} aria-pressed={selectedRating === score} aria-label={`${score} ${score === 1 ? 'estrela' : 'estrelas'}`} className="rounded p-2 text-amber-400 hover:bg-muted disabled:opacity-50">
                        <Star className={`h-7 w-7 ${score <= selectedRating ? 'fill-amber-400' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 min-h-5 text-xs text-muted-foreground">{selectedRating ? `${selectedRating} de 5 estrelas` : 'Selecione uma nota'}</p>
                  <button type="button" onClick={() => rate.mutate(selectedRating)} disabled={!selectedRating || rate.isPending} className="btn btn-primary mt-2 disabled:opacity-50">
                    {rate.isPending ? 'Enviando avaliação…' : 'Enviar avaliação'}
                  </button>
                  {ratingError ? <p role="alert" className="mt-2 text-sm text-destructive">{ratingError}</p> : null}
                </div>
              ) : null}
              {scope === 'help' && savedRating ? (
                <div className="border-t border-border p-4 text-center">
                  <div className="flex justify-center" aria-label={`Sua avaliação: ${savedRating} de 5 estrelas`}>
                    {[1, 2, 3, 4, 5].map((score) => <Star key={score} className={`h-5 w-5 text-amber-400 ${score <= savedRating ? 'fill-amber-400' : ''}`} />)}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Obrigado por avaliar o atendimento!</p>
                </div>
              ) : null}
              {ticket.status === 'CLOSED' && !savedRating ? <p className="border-t border-border p-4 text-center text-sm text-muted-foreground">Este chamado foi encerrado.</p> : null}
              {send.isError ? <p role="alert" className="px-4 pb-3 text-sm text-destructive">Não foi possível enviar a mensagem. Tente novamente.</p> : null}
            </>
          )}
        </section>
    </div>
  )

  if (onClose) {
    return <TicketConversationDialog title={ticket.subject} onClose={onClose}>{content}</TicketConversationDialog>
  }

  if (embedded) {
    return (
      <div className="space-y-4">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para Ajuda
          </button>
        ) : null}
        {content}
      </div>
    )
  }

  return (
    <>
      <PageHeader>
        <div>
          <button type="button" onClick={() => navigate(scope === 'support' ? '/support' : '/help')} className="mb-1 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <PageTitle>{ticket.subject}</PageTitle>
        </div>
      </PageHeader>
      <PageContent className="mx-auto w-full max-w-4xl">{content}</PageContent>
    </>
  )
}

function MessageBubble({ message, mine }: { message: SupportMessage; mine: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <article className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
        <p className="mb-1 text-[11px] font-semibold opacity-80">{mine ? 'Você' : message.sender.name}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        <time className="mt-2 block text-right text-[10px] opacity-70" dateTime={message.createdAt}>
          {new Date(message.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </time>
      </article>
    </div>
  )
}
