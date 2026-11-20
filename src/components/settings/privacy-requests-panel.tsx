import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Download, FileDown } from 'lucide-react'
import { notify } from '@/lib/notify'
import { extractApiMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { privacyApi } from '@/services/api/privacy'
import { loadNotificationPreferences } from '@/lib/notification-preferences'
import type {
  PrivacyDataExport,
  PrivacyRequest,
  PrivacyRequestStatus,
  PrivacyRequestType,
} from '@/types/privacy'

const REQUEST_TYPES: { value: PrivacyRequestType; label: string }[] = [
  { value: 'ACCESS', label: 'Acessar meus dados' },
  { value: 'CORRECTION', label: 'Corrigir meus dados' },
  { value: 'DELETION', label: 'Solicitar eliminação' },
  { value: 'PORTABILITY', label: 'Solicitar portabilidade' },
  { value: 'OPPOSITION', label: 'Opor-me a um tratamento' },
  { value: 'INFORMATION', label: 'Pedir informações sobre o tratamento' },
]

const STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  RECEIVED: 'Recebida',
  IN_REVIEW: 'Em análise',
  WAITING_FOR_INFORMATION: 'Aguardando informações',
  FULFILLED: 'Concluída',
  PARTIALLY_FULFILLED: 'Concluída parcialmente',
  DENIED: 'Não atendida',
  CANCELLED: 'Cancelada',
}

const TYPE_LABELS = Object.fromEntries(REQUEST_TYPES.map(({ value, label }) => [value, label])) as Record<PrivacyRequestType, string>
const CANCELLABLE = new Set<PrivacyRequestStatus>(['RECEIVED', 'IN_REVIEW', 'WAITING_FOR_INFORMATION'])

function RequestCard({ request, onCancel, cancelling }: {
  request: PrivacyRequest
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()
  const responseMutation = useMutation({
    mutationFn: () => privacyApi.respondWithInformation(request.id, message.trim()),
    onSuccess: async () => {
      setMessage('')
      await queryClient.invalidateQueries({ queryKey: ['privacy-requests', 'mine'] })
      notify.success('Informações enviadas. Sua solicitação voltou para análise.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível enviar as informações.'),
  })

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{TYPE_LABELS[request.type]}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enviada em {new Date(request.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          {STATUS_LABELS[request.status]}
        </span>
      </div>
      {request.history.length > 1 && (
        <ol className="mt-4 space-y-2 border-l border-border pl-3">
          {request.history.map((event, index) => (
            <li key={`${event.toStatus}-${event.createdAt}-${index}`} className="text-xs text-muted-foreground">
              <p>{STATUS_LABELS[event.toStatus]} · {new Date(event.createdAt).toLocaleString('pt-BR')}</p>
              {event.responseMessage && (
                <p className="mt-1 whitespace-pre-wrap text-foreground"><strong>Resposta da equipe:</strong> {event.responseMessage}</p>
              )}
              {event.userMessage && (
                <p className="mt-1 whitespace-pre-wrap text-foreground"><strong>Sua resposta:</strong> {event.userMessage}</p>
              )}
            </li>
          ))}
        </ol>
      )}
      {CANCELLABLE.has(request.status) && (
        <Button variant="ghost" className="mt-3" loading={cancelling} onClick={() => onCancel(request.id)}>
          Cancelar solicitação
        </Button>
      )}
      {request.status === 'WAITING_FOR_INFORMATION' && (
        <form
          className="mt-4 space-y-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            responseMutation.mutate()
          }}
        >
          <label htmlFor={`privacy-information-${request.id}`} className="label">
            Enviar as informações solicitadas
          </label>
          <p id={`privacy-information-help-${request.id}`} className="text-xs text-muted-foreground">
            Responda apenas ao que foi pedido. Não envie senhas, códigos de acesso ou documentos.
          </p>
          <textarea
            id={`privacy-information-${request.id}`}
            aria-describedby={`privacy-information-help-${request.id}`}
            className="input w-full resize-y"
            maxLength={1000}
            rows={3}
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={responseMutation.isPending} disabled={!message.trim()}>
              Enviar informações
            </Button>
          </div>
        </form>
      )}
    </article>
  )
}

export function PrivacyRequestsPanel() {
  const [type, setType] = useState<PrivacyRequestType>('ACCESS')
  const [exportedDocuments, setExportedDocuments] = useState<PrivacyDataExport['documents']>([])
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const requestsQuery = useQuery({
    queryKey: ['privacy-requests', 'mine'],
    queryFn: privacyApi.listMine,
  })
  const createMutation = useMutation({
    mutationFn: privacyApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['privacy-requests', 'mine'] })
      notify.success('Solicitação registrada. Você pode acompanhar o andamento nesta tela.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível registrar a solicitação.'),
  })
  const cancelMutation = useMutation({
    mutationFn: privacyApi.cancel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['privacy-requests', 'mine'] })
      notify.success('Solicitação cancelada.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível cancelar a solicitação.'),
  })

  const exportMutation = useMutation({
    mutationFn: privacyApi.exportData,
    onSuccess: (data) => {
      setExportedDocuments(data.documents)
      const browserLocalSettings = {
        notificationPreferences: loadNotificationPreferences(),
        theme: (() => {
          try {
            return localStorage.getItem('agendaqui:theme') ?? 'system'
          } catch {
            return 'unavailable'
          }
        })(),
      }
      const file = new Blob(
        [JSON.stringify({ ...data, browserLocalSettings }, null, 2)],
        { type: 'application/json;charset=utf-8' },
      )
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `agendaqui-dados-pessoais-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify.success('Cópia dos dados preparada para download.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível preparar a cópia dos dados.'),
  })

  const downloadDocument = async (id: string) => {
    setDownloadingDocumentId(id)
    try {
      const file = await privacyApi.downloadDocument(id)
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      anchor.href = url
      const extension = exportedDocuments.find((item) => item.id === id)?.mimeType === 'application/pdf'
        ? 'pdf'
        : exportedDocuments.find((item) => item.id === id)?.mimeType === 'image/png'
          ? 'png'
          : 'jpg'
      anchor.download = `documento-de-verificacao-${id}.${extension}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error: unknown) {
      notify.error(extractApiMessage(error) ?? 'Não foi possível baixar este documento.')
    } finally {
      setDownloadingDocumentId(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-foreground">Cópia dos seus dados</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gere um arquivo com os dados vinculados à sua conta. Senhas, tokens e códigos de autenticação não são incluídos.
              Preferências salvas apenas neste navegador serão acrescentadas pelo aplicativo.
            </p>
          </div>
          <Button loading={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            <FileDown className="h-4 w-4" />
            Baixar meus dados
          </Button>
        </div>
        {exportedDocuments.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Documentos de verificação associados à conta</p>
            <ul className="space-y-2">
              {exportedDocuments.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {file.documentType.replaceAll('_', ' ')} · versão {file.version} · {Math.ceil(file.sizeBytes / 1024)} KB
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={downloadingDocumentId === file.id}
                    disabled={downloadingDocumentId !== null && downloadingDocumentId !== file.id}
                    onClick={() => void downloadDocument(file.id)}
                  >
                    <Download className="h-4 w-4" />
                    Baixar arquivo
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-foreground">Seus direitos de privacidade</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre um pedido e acompanhe o status aqui. A solicitação será analisada pela equipe; este formulário não apaga dados automaticamente.
          Não inclua CPF, documentos ou informações sensíveis no pedido.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="privacy-request-type" className="label">O que você deseja solicitar?</label>
            <select
              id="privacy-request-type"
              value={type}
              onChange={(event) => setType(event.target.value as PrivacyRequestType)}
              className="input mt-1.5 w-full"
            >
              {REQUEST_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(type)}>
            Registrar pedido
          </Button>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="text-base font-semibold text-foreground">Solicitações registradas</h2>
        {requestsQuery.isPending && <p className="text-sm text-muted-foreground">Carregando solicitações…</p>}
        {requestsQuery.isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar suas solicitações.</p>}
        {requestsQuery.isSuccess && requestsQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Você ainda não registrou solicitações.</p>
        )}
        {requestsQuery.data?.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onCancel={(id) => cancelMutation.mutate(id)}
            cancelling={cancelMutation.isPending}
          />
        ))}
        {requestsQuery.data?.length === 50 && (
          <p className="text-xs text-muted-foreground">Exibindo as 50 solicitações mais recentes.</p>
        )}
      </section>
    </div>
  )
}
