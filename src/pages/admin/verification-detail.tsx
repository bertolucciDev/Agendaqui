import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { adminApi } from '@/services/api/admin'
import type {
  AdminVerificationDocument,
  RejectionReason,
} from '@/types/admin'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/lib/notify'
import { getApiErrorMessage } from '@/lib/api-error'
import { DocumentPreviewDialog } from '@/components/documents/document-preview-dialog'
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const REJECTION_LABELS: Record<RejectionReason, string> = {
  DOCUMENT_ILLEGIBLE: 'Documento ilegível',
  NOME_DIVERGENTE: 'Nome divergente',
  DOCUMENTO_VENCIDO: 'Documento vencido',
  RESPONSAVEL_INCOERENTE: 'Responsável incoerente',
  ARQUIVO_NAO_CORRESPONDE: 'Arquivo não corresponde',
  OUTRO: 'Outro',
}

/** Rótulo legível do tipo de documento (o back-end devolve o enum cru). */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CPF_FRENTE: 'CPF — frente',
  CPF_VERSO: 'CPF — verso',
  CPF_SELFIE: 'CPF — selfie',
  RG_FRENTE: 'RG — frente',
  RG_VERSO: 'RG — verso',
  CIN_FRENTE: 'CIN — frente',
  CIN_VERSO: 'CIN — verso',
  COMPROVANTE_CNPJ: 'Comprovante de CNPJ',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export default function AdminVerificationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState<RejectionReason | ''>('')
  const [rejectComment, setRejectComment] = useState('')
  const [isActing, setIsActing] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<AdminVerificationDocument | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'verification', id],
    queryFn: () => adminApi.getVerification(id!),
    enabled: !!id,
  })
  const businessQuery = useQuery({
    queryKey: ['admin', 'business-detail', data?.approvedBusinessId],
    queryFn: () => adminApi.getBusinessDetail(data!.approvedBusinessId!),
    enabled: Boolean(data?.approvedBusinessId),
  })

  const handleOpenDocument = (doc: AdminVerificationDocument) => {
    setPreviewDoc(doc)
  }

  const handleApprove = async () => {
    if (!id || !data) return
    setIsActing(true)
    try {
      const result = await adminApi.approveVerification(id)
      notify.success(`Negócio aprovado! ID: ${result.businessId}`)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      navigate('/admin/verifications')
    } catch (e: any) {
      notify.error(getApiErrorMessage(e, 'Erro ao aprovar'))
    } finally {
      setIsActing(false)
    }
  }

  const handleReject = async () => {
    if (!id || !rejectReason) return
    setIsActing(true)
    try {
      await adminApi.rejectVerification(id, {
        reason: rejectReason,
        comment: rejectComment.trim(),
      })
      notify.success('Solicitação rejeitada.')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      navigate('/admin/verifications')
    } catch (e: any) {
      notify.error(getApiErrorMessage(e, 'Erro ao rejeitar'))
    } finally {
      setIsActing(false)
      setShowReject(false)
    }
  }

  const handleResend = async () => {
    if (!id) return
    setIsActing(true)
    try {
      await adminApi.requestResend(id)
      notify.success('Solicitação reaberta para reenvio.')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      refetch()
    } catch (e: any) {
      notify.error(getApiErrorMessage(e, 'Erro ao reabrir'))
    } finally {
      setIsActing(false)
    }
  }

  const handleBlock = async () => {
    if (!id) return
    setIsActing(true)
    try {
      await adminApi.blockBusiness(id)
      notify.success('Negócio bloqueado.')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'business-detail', data?.approvedBusinessId] })
      refetch()
    } catch (e: any) {
      notify.error(getApiErrorMessage(e, 'Erro ao bloquear'))
    } finally {
      setIsActing(false)
    }
  }

  const handleUnblock = async () => {
    if (!id) return
    setIsActing(true)
    try {
      await adminApi.unblockBusiness(id)
      notify.success('Negócio desbloqueado.')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'business-detail', data?.approvedBusinessId] })
      refetch()
    } catch (e: any) {
      notify.error(getApiErrorMessage(e, 'Erro ao desbloquear'))
    } finally {
      setIsActing(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader>
          <PageTitle>Carregando...</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </PageContent>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <PageHeader>
          <PageTitle>Verificação não encontrada</PageTitle>
        </PageHeader>
        <PageContent>
          <Link to="/admin/verifications" className="btn btn-primary">
            Voltar
          </Link>
        </PageContent>
      </div>
    )
  }

  const isPending = data.status === 'PENDING'
  const isApproved = data.status === 'APPROVED'
  const isRejected = data.status === 'REJECTED'
  const isDraft = data.status === 'DRAFT'
  const isBusinessBlocked = businessQuery.data?.status === 'BLOCKED'
  const canResend = data.attemptCount < 3

  return (
    <div>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Link to="/admin/verifications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <PageTitle>
              {data.tradeName || data.legalName || 'Verificação'}
            </PageTitle>
            <p className="text-sm text-muted-foreground">
              {data.verificationId && `#${data.verificationId.slice(0, 8)}`}
            </p>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Informações do Negócio">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome Fantasia" value={data.tradeName} />
                <Field label="Razão Social" value={data.legalName} />
                <Field label="Documento" value={data.document} />
                <Field label="Tipo" value={data.businessType === 'COMPANY' ? 'Pessoa Jurídica' : 'Pessoa Física'} />
                {data.categoryId && <Field label="Categoria ID" value={data.categoryId} />}
              </div>
            </Section>

            <Section title="Status">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium">
                  {isPending && <><Clock className="h-4 w-4 text-amber-500" /> Pendente</>}
                  {isApproved && <><CheckCircle2 className="h-4 w-4 text-green-500" /> Aprovado</>}
                  {isRejected && <><XCircle className="h-4 w-4 text-red-500" /> Rejeitado</>}
                  {isDraft && <><FileText className="h-4 w-4 text-blue-500" /> Rascunho</>}
                  {data.status === 'CANCELLED' && <><Ban className="h-4 w-4 text-gray-500" /> Cancelado</>}
                  {data.status === 'EXPIRED' && <><Clock className="h-4 w-4 text-gray-500" /> Expirado</>}
                </span>
                <span className="text-sm text-muted-foreground">
                  Tentativa {data.attemptCount}/3
                </span>
              </div>
              {data.submittedAt && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Enviado em {new Date(data.submittedAt).toLocaleString('pt-BR')}
                </p>
              )}
              {data.expiresAt && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Expira em {new Date(data.expiresAt).toLocaleString('pt-BR')}
                </p>
              )}
              {isRejected && data.rejectionReason && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Motivo: {REJECTION_LABELS[data.rejectionReason] ?? data.rejectionReason}
                  </p>
                  {data.rejectionComment && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                      {data.rejectionComment}
                    </p>
                  )}
                </div>
              )}
            </Section>

            <Section title="Documentos">
              {data.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
              ) : (
                <div className="grid gap-3">
                  {data.documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleOpenDocument(doc)}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.documentType] ??
                              doc.documentType.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            v{doc.version} • {(doc.sizeBytes / 1024).toFixed(0)} KB • {doc.mimeType}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          doc.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : doc.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Right: actions */}
          <div className="space-y-6">
            <Section title="Ações">
              <div className="space-y-2">
                {isPending && (
                  <>
                    <Button
                      className="w-full"
                      onClick={handleApprove}
                      disabled={isActing}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setShowReject(true)}
                      disabled={isActing}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </>
                )}

                {isApproved && data.approvedBusinessId && !businessQuery.isPending && !isBusinessBlocked && (
                  <>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleBlock}
                      disabled={isActing}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Bloquear Negócio
                    </Button>
                  </>
                )}

                {(isDraft || isRejected) && canResend && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={isActing}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isRejected ? 'Solicitar Reenvio' : 'Reabrir para Edição'}
                  </Button>
                )}

                {isApproved && data.approvedBusinessId && isBusinessBlocked && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUnblock}
                    disabled={isActing}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Desbloquear Negócio
                  </Button>
                )}
              </div>
            </Section>

            {data.approvedBusinessId && (
              <Section title="Negócio Aprovado">
                <Field label="Business ID" value={data.approvedBusinessId} />
                <Field label="Status do negócio" value={businessQuery.data?.status ?? 'Carregando…'} />
              </Section>
            )}
          </div>
        </div>

        {/* Reject modal */}
        {showReject && (
          <RejectModal
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            rejectComment={rejectComment}
            setRejectComment={setRejectComment}
            onCancel={() => setShowReject(false)}
            onConfirm={handleReject}
            isActing={isActing}
          />
        )}

        {/* Preview do documento */}
        <DocumentPreviewDialog
          open={previewDoc !== null}
          contentUrl={previewDoc?.contentUrl ?? null}
          title={
            previewDoc
              ? (DOCUMENT_TYPE_LABELS[previewDoc.documentType] ??
                previewDoc.documentType.replace(/_/g, ' '))
              : ''
          }
          mimeType={previewDoc?.mimeType}
          sizeBytes={previewDoc?.sizeBytes}
          fileName={
            previewDoc
              ? `${previewDoc.documentType.toLowerCase().replace(/_/g, '-')}-v${previewDoc.version}`
              : undefined
          }
          onClose={() => setPreviewDoc(null)}
        />
      </PageContent>
    </div>
  )
}

function RejectModal({
  rejectReason,
  setRejectReason,
  rejectComment,
  setRejectComment,
  onCancel,
  onConfirm,
  isActing,
}: {
  rejectReason: string
  setRejectReason: (v: RejectionReason | '') => void
  rejectComment: string
  setRejectComment: (v: string) => void
  onCancel: () => void
  onConfirm: () => void
  isActing: boolean
}) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    if (panel) {
      const focusable = panel.querySelectorAll<HTMLElement>('button, input, select, textarea')
      ;(focusable[0] ?? panel).focus()
    }
    return () => {
      const prev = restoreRef.current
      if (prev && document.contains(prev)) prev.focus()
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isActing) onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isActing, onCancel])

  const canConfirm = rejectReason && rejectComment.trim().length >= 3

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay-scrim)]"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isActing) onCancel() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-border bg-surface-overlay p-5 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Rejeitar solicitação
        </h2>
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          Informe o motivo da rejeição. O solicitante receberá essa informação.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Motivo <span className="text-destructive">*</span>
            </label>
            <Select
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value as RejectionReason | '')}
              options={[
                { value: 'DOCUMENT_ILLEGIBLE', label: 'Documento ilegível' },
                { value: 'NOME_DIVERGENTE', label: 'Nome divergente' },
                { value: 'DOCUMENTO_VENCIDO', label: 'Documento vencido' },
                { value: 'RESPONSAVEL_INCOERENTE', label: 'Responsável incoerente' },
                { value: 'ARQUIVO_NAO_CORRESPONDE', label: 'Arquivo não corresponde' },
                { value: 'OUTRO', label: 'Outro' },
              ]}
              placeholder="Selecione um motivo"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Comentário <span className="text-destructive">*</span>
            </label>
            <textarea
              placeholder="Detalhe o motivo (mínimo 3 caracteres)..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="block w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground transition-colors duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <p className={cn('mt-1 text-xs', rejectComment.trim().length >= 3 ? 'text-muted-foreground' : 'text-destructive')}>
              {rejectComment.length}/500 caracteres
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isActing}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={isActing}
            disabled={!canConfirm}
          >
            Rejeitar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
