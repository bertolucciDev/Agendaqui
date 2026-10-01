import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useBusinessVerification } from '@/hooks/use-business-verification'
import { useSession } from '@/app/providers/session'
import { DOCUMENT_LABELS, REJECTION_LABELS } from '@/lib/verification/document-rules'
import { isEmpty } from '@/lib/verification/permissions'
import { describeError } from '@/lib/verification/errors'
import type { BusinessVerification } from '@/types/business-verification'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Acompanhamento da verificação (`/onboarding/business-verification`).
 *
 * A rota fica sob `/onboarding*` porque o `FirstBusinessGuard` é congelado:
 * ele redireciona para `/onboarding/business` qualquer usuário sem business
 * administrativo no catálogo da sessão, e só deixa passar quem já está em
 * `/onboarding*`.
 *
 * Esta tela é somente de leitura dos estados. A edição continua em
 * `/onboarding/business`. O polling de PENDING→APPROVED é feito pelo hook
 * `useBusinessVerification`, que também executa o D8 ao observar APPROVED.
 */

const STATUS_VIEW: Record<string, { title: string; body: string; tone: string }> = {
  PENDING: {
    title: 'Solicitação em análise',
    body: 'Recebemos seus documentos e eles estão em análise. Você será notificado quando houver uma decisão. Enquanto isso, os dados da solicitação não podem ser alterados.',
    tone: 'text-foreground',
  },
  APPROVED: {
    title: 'Verificação aprovada',
    body: 'Sua verificação foi aprovada. Estamos abrindo seu ambiente administrativo.',
    tone: 'text-foreground',
  },
  REJECTED: {
    title: 'Solicitação rejeitada',
    body: 'A análise não aprovou esta solicitação. Veja o motivo abaixo e ajuste o que foi indicado.',
    tone: 'text-destructive',
  },
  EXPIRED: {
    title: 'Verificação expirada',
    body: 'Esta solicitação passou do prazo de validade. Abra uma nova verificação para continuar.',
    tone: 'text-destructive',
  },
  CANCELLED: {
    title: 'Solicitação cancelada',
    body: 'Esta verificação foi encerrada. Abra uma nova verificação quando quiser.',
    tone: 'text-muted-foreground',
  },
}

/**
 * Caminho de ação por estado:
 * - REJECTED com `canResubmit`: o rascunho rejeitado é EDITÁVEL no onboarding
 *   (o backend aceita PATCH em DRAFT/REJECTED);
 * - EXPIRED/CANCELLED: a solicitação está encerrada — o onboarding abre uma
 *   NOVA (o backend só reusa a solicitação aberta);
 * - demais estados não recebem ação aqui.
 */
function canOfferEdit(data: { status: BusinessVerification['status']; canResubmit: boolean }): boolean {
  return data.status === 'REJECTED' && data.canResubmit
}

function canReopen(data: { status: BusinessVerification['status'] }): boolean {
  return data.status === 'EXPIRED' || data.status === 'CANCELLED'
}

export default function OnboardingBusinessVerificationPage() {
  const navigate = useNavigate()
  const { refreshSession } = useSession()
  const { verification: data, isLoading, error, refetch, d8Outcome } = useBusinessVerification()

  const status = data?.status
  const empty = data !== undefined && isEmpty(data)

  useEffect(() => {
    if (status !== 'APPROVED') return
    refreshSession()
    navigate('/dashboard', { replace: true })
  }, [navigate, refreshSession, status])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar sua solicitação</CardTitle>
            <CardDescription>{describeError(error, 'load')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || empty || status === 'DRAFT') {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma verificação em andamento</CardTitle>
            <CardDescription>Você ainda não abriu uma solicitação de verificação.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/onboarding/business">
              <Button>Começar verificação</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const view = STATUS_VIEW[status] ?? STATUS_VIEW.PENDING

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-4 px-4">
      <Card>
        <CardHeader>
          <CardTitle className={view.tone}>{view.title}</CardTitle>
          <CardDescription>{view.body}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {status === 'REJECTED' ? (
            <div
              role="alert"
              data-testid="rejection-reason"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground"
            >
              <p className="font-medium">Motivo informado na análise</p>
              <p data-testid="rejection-label" className="mt-1">
                {data.rejectionReason
                  ? (REJECTION_LABELS[data.rejectionReason] ?? data.rejectionReason)
                  : 'Não informado'}
              </p>
              {data.rejectionComment ? (
                <p data-testid="rejection-comment" className="mt-1 text-muted-foreground">
                  {data.rejectionComment}
                </p>
              ) : null}
              <p data-testid="rejection-attempts" className="mt-2 text-xs text-muted-foreground">
                Tentativa {data.attemptCount} de {data.maxAttempts}
              </p>
            </div>
          ) : null}

          {data.requiredDocumentTypes.length > 0 ? (
            <div data-testid="required-documents" className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Documentos exigidos</p>
              <ul className="mt-1 list-disc pl-5">
                {data.requiredDocumentTypes.map((type) => (
                  <li key={type} data-testid={`required-${type}`}>
                    {DOCUMENT_LABELS[type]}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canOfferEdit(data) ? (
            <Link to="/onboarding/business">
              <Button variant="outline">Editar solicitação</Button>
            </Link>
          ) : null}

          {canReopen(data) ? (
            <Link to="/onboarding/business">
              <Button variant="outline">Abrir nova verificação</Button>
            </Link>
          ) : null}

          {status === 'APPROVED' && d8Outcome ? (
            <p data-testid="d8-outcome" className="text-xs text-muted-foreground">
              Preparando seu ambiente… ({d8Outcome})
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
