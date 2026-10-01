import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, User, Loader2 } from 'lucide-react'
import { categoriesApi } from '@/services/api/categories'
import { useSession } from '@/app/providers/session'
import {
  useBusinessVerificationFlow,
  verificationPermissions,
} from '@/hooks/use-business-verification-flow'
import { useBusinessVerification } from '@/hooks/use-business-verification'
import { maskCpfCnpj, maskPhone, unmask } from '@/lib/masks'
import { canEdit, isEmpty } from '@/lib/verification/permissions'
import {
  DOCUMENT_HINTS,
  DOCUMENT_LABELS,
  documentTypesFor,
  isDocumentRequired,
  isDocumentSubmitted,
} from '@/lib/verification/document-rules'
import type { DocumentUploadPhase } from '@/lib/verification/upload-document'
import type { CreateVerificationPayload } from '@/services/api/business-verification'
import type {
  BusinessVerification,
  BusinessVerificationBusinessType,
} from '@/types/business-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * FE-MVP-01 — Onboarding do PRIMEIRO negócio, agora via Business Verification.
 *
 * ANTES: POST /businesses (endpoint removido — responde 410, decisão B-1).
 * AGORA: FirstBusinessGuard → verificação em DRAFT → documentos → submit → PENDING.
 *
 * O formulário valida apenas o que é digitável (zod). Coerência
 * tipo↔documento, obrigatoriedade de documentos, limite de tentativas e
 * expiração são do backend: aqui consumimos apenas o contrato — `status`,
 * `canResubmit`, `requiredDocumentTypes` e `missingDocumentTypes` — e as
 * permissões de tela são derivadas em `lib/verification/permissions.ts`.
 *
 * Quando a verificação chega a APPROVED, o hook `useBusinessVerification`
 * (D8, já validado em T1–T9) assume: refaz a sessão e dispara a preferência.
 * Esta tela apenas redireciona para o dashboard.
 */

const formSchema = z
  .object({
    businessType: z.enum(['COMPANY', 'INDIVIDUAL']),
    tradeName: z.string().min(2, 'Informe o nome do negócio'),
    document: z.string().min(1, 'Informe o documento'),
    categoryId: z.string().min(1, 'Selecione uma categoria'),
    legalName: z.string().optional(),
    responsibleName: z.string().optional(),
    // O backend exige CPF do responsável para COMPANY (deriveResponsibleCpf em
    // create/update); para INDIVIDUAL ele é derivado do próprio documento.
    responsibleCpf: z.string().optional(),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || unmask(v).length >= 10, 'Telefone inválido'),
  })
  .superRefine((values, ctx) => {
    if (values.businessType === 'COMPANY' && unmask(values.responsibleCpf ?? '').length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['responsibleCpf'],
        message: 'Informe o CPF do responsável (11 dígitos)',
      })
    }
  })

type FormData = z.infer<typeof formSchema>

const UPLOAD_COPY: Record<DocumentUploadPhase, string> = {
  idle: 'Não enviado',
  presigned: 'Preparando envio',
  uploading: 'Enviando',
  uploaded: 'Enviado — validando',
  completed: 'Concluído',
  error: 'Erro no envio',
}

export default function OnboardingBusinessPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session, refreshSession } = useSession()
  const flow = useBusinessVerificationFlow()

  const [step, setStep] = useState<'type' | 'form'>('type')
  const [documentDisplay, setDocumentDisplay] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState('')
  const [responsibleCpfDisplay, setResponsibleCpfDisplay] = useState('')
  const hydratedFor = useRef<string | null>(null)

  const alreadyHasBusiness = !!session && session.businesses.length > 0
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 300_000,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessType: 'COMPANY',
      tradeName: '',
      document: '',
      categoryId: '',
      legalName: '',
      responsibleName: '',
      responsibleCpf: '',
      phone: '',
    },
  })

  // A leitura é do hook compartilhado (mesma chave de query do D8): uma única
  // fonte, sem polling concorrente.
  const { verification: rawVerification, isLoading, error, refetch } = useBusinessVerification()

  // `GET /me/business-verification` responde 200 com o output vazio
  // (`verificationId: null`) quando não existe solicitação. Isso NÃO é uma
  // verificação: tratar como tal faria a tela tentar PATCH em um DRAFT
  // inexistente em vez de criar um novo.
  const verification = isEmpty(rawVerification) ? null : rawVerification

  const selectedType = watch('businessType')
  // Verificação existente manda no tipo; senão vale a escolha da tela.
  const businessType: BusinessVerificationBusinessType =
    verification?.businessType ?? selectedType
  const status = verification?.status
  const { mayUpload, maySubmit } = verificationPermissions(verification)

  // DRAFT existente é preservado e hidratado uma única vez (evita sobrescrever
  // o que o usuário está digitando com um refetch).
  useEffect(() => {
    if (!verification) return
    if (hydratedFor.current === verification.verificationId) return
    hydratedFor.current = verification.verificationId
    setValue('businessType', verification.businessType ?? 'COMPANY')
    setValue('tradeName', verification.tradeName ?? '')
    setValue('document', verification.document ?? '')
    setValue('categoryId', verification.categoryId ?? '')
    setValue('legalName', verification.legalName ?? '')
    setValue('responsibleName', verification.responsibleName ?? '')
    setValue('responsibleCpf', verification.responsibleCpf ?? '')
    setValue('phone', verification.phone ?? '')
    setDocumentDisplay(maskCpfCnpj(verification.document ?? ''))
    setResponsibleCpfDisplay(maskCpfCnpj(verification.responsibleCpf ?? ''))
    setPhoneDisplay(maskPhone(verification.phone ?? ''))
    if (verification.businessType) setStep('form')
  }, [setValue, verification])

  // APPROVED: o D8 já executou (o hook dispara ao observar APPROVED). Aqui só
  // garantimos a sessão fresca e seguimos ao dashboard. A rota de
  // acompanhamento é quem mostra o estado intermediário.
  useEffect(() => {
    if (status !== 'APPROVED') return
    void refetch()
    refreshSession()
    void queryClient.invalidateQueries({ queryKey: ['session'] })
    navigate('/dashboard', { replace: true })
  }, [navigate, queryClient, refreshSession, refetch, status])

  // PENDING é estado de ESPERA: nada a editar, então vai para o acompanhamento.
  // REJECTED permanece aqui (é editável até o limite de tentativas);
  // EXPIRED/CANCELLED voltam como formulário pré-preenchido para uma NOVA
  // solicitação — `submitForm` decide create vs update por `canEdit(status)`.
  useEffect(() => {
    if (status === 'PENDING') {
      navigate('/onboarding/business-verification', { replace: true })
    }
  }, [navigate, status])

  if (alreadyHasBusiness) return <Navigate to="/dashboard" replace />

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Não foi possível carregar sua solicitação</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  const submitForm = handleSubmit(async (values) => {
    const payload: CreateVerificationPayload = {
      businessType: values.businessType,
      // DTO exige dígitos crus; a máscara é só apresentação.
      document: unmask(values.document),
      tradeName: values.tradeName.trim(),
      categoryId: values.categoryId,
      ...(values.legalName ? { legalName: values.legalName.trim() } : {}),
      ...(values.responsibleName ? { responsibleName: values.responsibleName.trim() } : {}),
      ...(values.businessType === 'COMPANY'
        ? { responsibleCpf: unmask(values.responsibleCpf ?? '') }
        : {}),
      ...(values.phone ? { phone: unmask(values.phone) } : {}),
    }

    // Solicitação aberta (DRAFT/REJECTED) é PRESERVADA: `update` (PATCH).
    // Encerrada (EXPIRED/CANCELLED) não é editável pelo backend: abre nova.
    const saved = canEdit(status ?? null) ? await flow.update(payload) : await flow.create(payload)
    if (saved) setStep('form')
  })

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-background px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Verificação do negócio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Precisamos validar seus documentos antes de liberar o ambiente administrativo.
        </p>
      </div>

      {step === 'type' && !verification ? (
        <Card>
          <CardHeader>
            <CardTitle>Como seu negócio está registrado?</CardTitle>
            <CardDescription>Isso define quais documentos serão exigidos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <TypeOption
              testId="pick-cnpj"
              title="CNPJ — Pessoa jurídica"
              description="Empresa, MEI ou prestador com CNPJ."
              icon={<Building2 className="h-5 w-5" />}
              onClick={() => {
                setStep('form')
                setDocumentDisplay('')
                setValue('businessType', 'COMPANY')
              }}
            />
            <TypeOption
              testId="pick-cpf"
              title="CPF — Pessoa física"
              description="Profissional autônomo sem CNPJ."
              icon={<User className="h-5 w-5" />}
              onClick={() => {
                setStep('form')
                setDocumentDisplay('')
                setValue('businessType', 'INDIVIDUAL')
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {step === 'form' && businessType ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {businessType === 'COMPANY' ? 'Dados da empresa' : 'Dados do profissional'}
            </CardTitle>
            <CardDescription>
              {verification
                ? 'Você pode editar enquanto a solicitação estiver aberta.'
                : 'Preencha para abrir sua solicitação.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form onSubmit={submitForm} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="tradeName">
                  Nome fantasia
                </label>
                <Input
                  id="tradeName"
                  placeholder="Ex.: Barbearia do Zé"
                  {...register('tradeName')}
                />
                {errors.tradeName ? (
                  <p className="mt-1 text-xs text-destructive">{errors.tradeName.message}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="document">
                  {businessType === 'COMPANY' ? 'CNPJ' : 'CPF'}
                </label>
                <Input
                  id="document"
                  placeholder={businessType === 'COMPANY' ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={documentDisplay}
                  onChange={(e) => {
                    const masked = maskCpfCnpj(e.target.value)
                    setDocumentDisplay(masked)
                    setValue('document', masked, { shouldValidate: true })
                  }}
                />
                {errors.document ? (
                  <p className="mt-1 text-xs text-destructive">{errors.document.message}</p>
                ) : null}
              </div>

              {businessType === 'COMPANY' ? (
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="legalName">
                    Razão social
                  </label>
                  <Input id="legalName" placeholder="Ex.: Barbearia do Zé LTDA" {...register('legalName')} />
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="responsibleName">
                  Responsável
                </label>
                <Input id="responsibleName" placeholder="Nome de quem responde" {...register('responsibleName')} />
              </div>

              {businessType === 'COMPANY' ? (
                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="responsibleCpf">
                    CPF do responsável
                  </label>
                  <Input
                    id="responsibleCpf"
                    placeholder="000.000.000-00"
                    value={responsibleCpfDisplay}
                    onChange={(e) => {
                      const masked = maskCpfCnpj(e.target.value)
                      setResponsibleCpfDisplay(masked)
                      setValue('responsibleCpf', masked, { shouldValidate: true })
                    }}
                  />
                  {errors.responsibleCpf ? (
                    <p className="mt-1 text-xs text-destructive">{errors.responsibleCpf.message}</p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="phone">
                  Telefone
                </label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={phoneDisplay}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value)
                    setPhoneDisplay(masked)
                    setValue('phone', masked)
                  }}
                />
                {errors.phone ? (
                  <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="categoryId">
                  Categoria
                </label>
                <Select
                  id="categoryId"
                  error={errors.categoryId ? errors.categoryId.message : undefined}
                  placeholder="Selecione"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  {...register('categoryId')}
                />
              </div>

              {flow.saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {flow.saveError}
                </p>
              ) : null}

              <Button type="submit" disabled={flow.saving}>
                {flow.saving
                  ? 'Salvando…'
                  : verification && canEdit(status ?? null)
                    ? 'Salvar alterações'
                    : 'Abrir solicitação'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {verification && mayUpload ? (
        <DocumentsCard verification={verification} businessType={businessType} flow={flow} />
      ) : null}

      {verification && mayUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Enviar para análise</CardTitle>
            <CardDescription>
              {verification.missingDocumentTypes.length > 0
                ? `Faltam ${verification.missingDocumentTypes.length} documento(s) obrigatório(s).`
                : 'Todos os documentos obrigatórios foram enviados.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {flow.submitError ? (
              <p role="alert" className="text-sm text-destructive">
                {flow.submitError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void flow.submit()}
                disabled={flow.submitting || flow.anyUploadInFlight || !maySubmit}
              >
                {flow.submitting ? 'Enviando…' : 'Submeter para análise'}
              </Button>
              <Button
                variant="outline"
                onClick={() => void flow.cancel()}
                disabled={flow.saving || flow.submitting}
              >
                Cancelar solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function DocumentsCard({
  verification,
  businessType,
  flow,
}: {
  verification: BusinessVerification
  businessType: BusinessVerificationBusinessType
  flow: ReturnType<typeof useBusinessVerificationFlow>
}) {
  const types = documentTypesFor(businessType)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>
          Aceitamos JPEG, PNG, WebP ou PDF. O arquivo é validado no servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {types.map((type) => {
          // Obrigatoriedade vem do backend, nunca de uma lista local.
          const required = isDocumentRequired(verification, type)
          const submitted = isDocumentSubmitted(verification, type)
          const upload = flow.documents[type]
          const busy =
            upload?.phase === 'presigned' ||
            upload?.phase === 'uploading' ||
            upload?.phase === 'uploaded'
          return (
            <div key={type} className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor={`doc-${type}`}
                data-testid={`doc-label-${type}`}
              >
                {DOCUMENT_LABELS[type]}
                <span
                  className={cn('ml-2 text-xs', required ? 'text-destructive' : 'text-muted-foreground')}
                >
                  {required ? 'obrigatório' : 'opcional'}
                </span>
              </label>
              <p className="text-xs text-muted-foreground">{DOCUMENT_HINTS[type]}</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id={`doc-${type}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  data-testid={`file-${type}`}
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    void flow.uploadDocument(type, file)
                  }}
                />
                <span data-testid={`doc-state-${type}`} className="text-xs text-muted-foreground">
                  {upload
                    ? `${UPLOAD_COPY[upload.phase]}${upload.fileName ? ` — ${upload.fileName}` : ''}`
                    : submitted
                      ? UPLOAD_COPY.completed
                      : UPLOAD_COPY.idle}
                </span>
                {submitted && upload?.phase !== 'completed' ? (
                  <span data-testid={`doc-submitted-${type}`} className="text-xs text-brand-600">
                    já enviado
                  </span>
                ) : null}
              </div>
              {upload?.phase === 'error' ? (
                <p role="alert" data-testid={`doc-error-${type}`} className="text-xs text-destructive">
                  {upload.error}
                </p>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function TypeOption({
  testId,
  title,
  description,
  icon,
  onClick,
}: {
  testId: string
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border border-border p-4 text-left transition hover:border-brand-500"
    >
      <span className="text-brand-500">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
