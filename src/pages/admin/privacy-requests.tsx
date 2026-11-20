import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { adminPrivacyApi } from '@/services/api/privacy'
import { extractApiMessage } from '@/lib/api-error'
import { notify } from '@/lib/notify'
import type { PrivacyRequestStatus, PrivacyRequestType } from '@/types/privacy'

const TYPE_LABELS: Record<PrivacyRequestType, string> = {
  ACCESS: 'Acesso aos dados',
  CORRECTION: 'Correção de dados',
  DELETION: 'Eliminação',
  PORTABILITY: 'Portabilidade',
  OPPOSITION: 'Oposição a tratamento',
  INFORMATION: 'Informações sobre tratamento',
}

const STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  WAITING_FOR_INFORMATION: 'Aguardando informações',
  FULFILLED: 'Concluída',
  PARTIALLY_FULFILLED: 'Concluída parcialmente',
  DENIED: 'Não atendida',
  CANCELLED: 'Cancelada',
}

const FILTER_OPTIONS: { value: PrivacyRequestStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
    value: value as PrivacyRequestStatus,
    label,
  })),
]

const NEXT_STATUSES: Partial<Record<PrivacyRequestStatus, PrivacyRequestStatus[]>> = {
  RECEIVED: ['IN_REVIEW'],
  IN_REVIEW: ['WAITING_FOR_INFORMATION', 'FULFILLED', 'PARTIALLY_FULFILLED', 'DENIED'],
  WAITING_FOR_INFORMATION: ['IN_REVIEW', 'FULFILLED', 'PARTIALLY_FULFILLED', 'DENIED'],
}

const PAGE_SIZE = 50

type PendingStatusUpdate = {
  requestId: string
  status: PrivacyRequestStatus
  responseMessage: string
}

export default function AdminPrivacyRequestsPage() {
  const [status, setStatus] = useState<PrivacyRequestStatus | ''>('')
  const [offset, setOffset] = useState(0)
  const [pendingStatus, setPendingStatus] = useState<PendingStatusUpdate | null>(null)
  const queryClient = useQueryClient()
  const queryKey = ['admin-privacy-requests', status, offset]

  const requestsQuery = useQuery({
    queryKey,
    queryFn: () => adminPrivacyApi.list({
      status: status || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, nextStatus, responseMessage }: {
      id: string
      nextStatus: PrivacyRequestStatus
      responseMessage: string
    }) => adminPrivacyApi.updateStatus(id, nextStatus, responseMessage || undefined),
    onSuccess: async () => {
      setPendingStatus(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-privacy-requests'] })
      notify.success('Atualização registrada no histórico e disponível no portal do titular.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível atualizar o status.'),
  })

  const total = requestsQuery.data?.total ?? 0
  const items = requestsQuery.data?.items ?? []

  return (
    <>
      <PageHeader>
        <PageTitle>Solicitações de privacidade</PageTitle>
      </PageHeader>
      <PageContent>
        <section className="card space-y-5 p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Fila de atendimento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O status registra o andamento, mas não executa automaticamente exportações ou eliminações. Confirme o atendimento antes de encerrar o pedido.
            </p>
          </div>

          <div className="max-w-xs">
            <label htmlFor="privacy-status-filter" className="label">Filtrar status</label>
            <select
              id="privacy-status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PrivacyRequestStatus | '')
                setOffset(0)
              }}
              className="input mt-1.5 w-full"
            >
              {FILTER_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {requestsQuery.isPending && <p className="text-sm text-muted-foreground">Carregando solicitações…</p>}
          {requestsQuery.isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar a fila.</p>}
          {requestsQuery.isSuccess && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação neste filtro.</p>
          )}

          <div className="space-y-3">
            {items.map((request) => {
              const nextStatuses = NEXT_STATUSES[request.status] ?? []
              const elapsedDays = Math.max(
                0,
                Math.floor((Date.now() - new Date(request.createdAt).getTime()) / 86_400_000),
              )
              const age = elapsedDays === 0
                ? 'menos de 1 dia'
                : `${elapsedDays} ${elapsedDays === 1 ? 'dia' : 'dias'}`
              return (
                <article key={request.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{TYPE_LABELS[request.type]}</p>
                      <p className="mt-1 text-sm text-foreground">{request.user.name}</p>
                      <p className="text-xs text-muted-foreground">{request.user.email}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recebida em {new Date(request.createdAt).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tempo desde o recebimento: {age}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        {STATUS_LABELS[request.status]}
                      </span>
                      {nextStatuses.length > 0 && (
                        <label className="text-xs text-muted-foreground">
                          Atualizar andamento
                          <select
                            aria-label={`Atualizar status de ${request.user.name}`}
                            className="input mt-1 block min-w-52"
                            value=""
                            disabled={updateMutation.isPending}
                            onChange={(event) => {
                              const nextStatus = event.target.value as PrivacyRequestStatus
                              if (nextStatus) {
                                setPendingStatus({
                                  requestId: request.id,
                                  status: nextStatus,
                                  responseMessage: '',
                                })
                              }
                            }}
                          >
                            <option value="">Selecionar status</option>
                            {nextStatuses.map((nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>{STATUS_LABELS[nextStatus]}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                  {pendingStatus?.requestId === request.id && (
                    <div className="mt-4 space-y-3 rounded-lg bg-muted/40 p-3">
                      <div>
                        <label htmlFor={`privacy-response-${request.id}`} className="label">
                          Resposta visível no portal do titular
                        </label>
                        <p id={`privacy-response-help-${request.id}`} className="mb-1 text-xs text-muted-foreground">
                          {request.type === 'DELETION' &&
                          (pendingStatus.status === 'FULFILLED' || pendingStatus.status === 'PARTIALLY_FULFILLED')
                            ? 'Antes de concluir, execute e confira o atendimento. Informe quais categorias foram eliminadas, quais foram mantidas e a justificativa e o prazo de revisão. Não inclua identificadores ou conteúdo pessoal.'
                            : 'Explique a pendência ou o resultado. Escreva apenas o necessário; não inclua CPF, documentos ou outros dados sensíveis.'}
                        </p>
                        <textarea
                          id={`privacy-response-${request.id}`}
                          aria-describedby={`privacy-response-help-${request.id}`}
                          maxLength={1000}
                          rows={3}
                          value={pendingStatus.responseMessage}
                          onChange={(event) => setPendingStatus({ ...pendingStatus, responseMessage: event.target.value })}
                          className="input w-full resize-y"
                        />
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                          {pendingStatus.responseMessage.length}/1000
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" onClick={() => setPendingStatus(null)} disabled={updateMutation.isPending}>
                          Cancelar
                        </Button>
                        <Button
                          loading={updateMutation.isPending}
                          disabled={pendingStatus.status !== 'IN_REVIEW' && !pendingStatus.responseMessage.trim()}
                          onClick={() => updateMutation.mutate({
                            id: request.id,
                            nextStatus: pendingStatus.status,
                            responseMessage: pendingStatus.responseMessage.trim(),
                          })}
                        >
                          Salvar resposta
                        </Button>
                      </div>
                    </div>
                  )}
                  <ol className="mt-4 space-y-1 border-l border-border pl-3">
                    {request.history.map((event, index) => (
                      <li key={`${event.toStatus}-${event.createdAt}-${index}`} className="text-xs text-muted-foreground">
                        <p>{STATUS_LABELS[event.toStatus]} · {new Date(event.createdAt).toLocaleString('pt-BR')}</p>
                        {event.responseMessage && (
                          <p className="mt-1 whitespace-pre-wrap text-foreground"><strong>Resposta da equipe:</strong> {event.responseMessage}</p>
                        )}
                        {event.userMessage && (
                          <p className="mt-1 whitespace-pre-wrap text-foreground"><strong>Informação do titular:</strong> {event.userMessage}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </article>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{total} solicitação(ões)</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button variant="outline" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                Próxima
              </Button>
            </div>
          </div>
        </section>
      </PageContent>
    </>
  )
}
