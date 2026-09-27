import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { Building2, User } from 'lucide-react'
import { businessesApi } from '@/services/api/businesses'
import { categoriesApi } from '@/services/api/categories'
import { useSession } from '@/app/providers/session'
import { firstBusinessSchema, type FirstBusinessFormData } from '@/lib/validations'
import { maskCpfCnpj, maskPhone, unmask } from '@/lib/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * FE-MVP-01 — Onboarding do PRIMEIRO negócio (primeiro acesso administrativo).
 * Distinto de /businesses/new (criação posterior dentro do ambiente administrativo).
 * Usa somente campos suportados pelo POST /businesses atual (sem razão social/nome fantasia —
 * campos inexistentes no backend não aparecem aqui; upload de documentos fora de escopo).
 * Após criar: invalida ['session'] (aguarda refetch) e navega ao dashboard.
 */
export default function OnboardingBusinessPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useSession()
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [documentDisplay, setDocumentDisplay] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState('')

  // sessão carregada com business administrativo → primeiro acesso já resolvido
  const alreadyHasBusiness = !!session && session.businesses.length > 0

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    setError,
    watch,
  } = useForm<FirstBusinessFormData>({
    resolver: zodResolver(firstBusinessSchema),
    defaultValues: { type: 'COMPANY' },
  })

  const type = watch('type')

  // campos mascarados são controlados por estado local — registrar explicitamente no RHF
  useEffect(() => {
    register('type')
    register('document')
    register('phone')
  }, [register])

  const createMutation = useMutation({
    mutationFn: async (data: FirstBusinessFormData) => {
      return businessesApi.create({
        name: data.name,
        document: unmask(data.document),
        type: data.type,
        categoryId: data.categoryId,
        locationName: 'Principal',
        address: data.address,
        timezone: 'America/Sao_Paulo',
        attendanceType: 'AT_LOCATION',
        phone: data.phone ? unmask(data.phone) : undefined,
        description: data.description || undefined,
      })
    },
    onSuccess: async () => {
      // aguarda o refetch da sessão (novo business no catálogo) antes de navegar
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Negócio criado! Bem-vindo(a).')
      navigate('/dashboard')
    },
    onError: (err) => {
      const status = err instanceof AxiosError ? err.response?.status : undefined
      if (status === 409) {
        setError('document', { message: 'Este documento já está cadastrado.' })
      } else if (status === 400) {
        toast.error('Verifique os dados informados e tente novamente.')
      } else {
        toast.error('Não foi possível criar o negócio agora. Tente novamente.')
      }
    },
  })

  const chooseType = (t: 'COMPANY' | 'INDIVIDUAL') => {
    setValue('type', t)
    setDocumentDisplay('')
    setValue('document', '')
    setStep('form')
  }

  const handleDocumentChange = (value: string) => {
    const max = type === 'COMPANY' ? 18 : 14
    const masked = maskCpfCnpj(value).slice(0, max)
    setDocumentDisplay(masked)
    setValue('document', masked, { shouldValidate: false })
  }

  if (alreadyHasBusiness) {
    return <Navigate to="/dashboard" replace />
  }

  if (step === 'type') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-bold text-foreground font-display">Como seu negócio está registrado?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vamos configurar seu primeiro negócio. Leva menos de um minuto.
          </p>
          <div className="mt-6 space-y-3" role="radiogroup" aria-label="Tipo de registro">
            <button
              type="button"
              data-testid="pick-cnpj"
              onClick={() => chooseType('COMPANY')}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-border-strong"
            >
              <Building2 className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold text-foreground">CNPJ</span>
                <span className="block text-xs text-muted-foreground">Empresa registrada</span>
              </span>
            </button>
            <button
              type="button"
              data-testid="pick-cpf"
              onClick={() => chooseType('INDIVIDUAL')}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-border-strong"
            >
              <User className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold text-foreground">CPF</span>
                <span className="block text-xs text-muted-foreground">Profissional autônomo / negócio individual</span>
              </span>
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Primeiro negócio — {type === 'COMPANY' ? 'CNPJ' : 'CPF'}</CardTitle>
          <CardDescription>Preencha os dados do seu negócio e da unidade principal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className={cn('space-y-4')}>
            <Input
              label={type === 'COMPANY' ? 'CNPJ' : 'CPF'}
              inputMode="numeric"
              placeholder={type === 'COMPANY' ? '00.000.000/0000-00' : '000.000.000-00'}
              value={documentDisplay}
              onChange={(e) => handleDocumentChange(e.target.value)}
              error={errors.document?.message}
            />
            <Input
              label="Nome do negócio"
              placeholder="Ex.: Barbearia do Zé"
              error={errors.name?.message}
              {...register('name')}
            />
            <div>
              <label className="label">Categoria</label>
              <Select
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Selecione uma categoria"
                error={errors.categoryId?.message}
                {...register('categoryId')}
              />
              {errors.categoryId?.message && (
                <p className="mt-1 text-xs text-destructive-soft-fg">{errors.categoryId.message}</p>
              )}
            </div>
            <Input
              label="Telefone (opcional)"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={phoneDisplay}
              onChange={(e) => {
                const m = maskPhone(e.target.value)
                setPhoneDisplay(m)
                setValue('phone', m, { shouldValidate: false })
              }}
              error={errors.phone?.message}
            />
            <Input
              label="Descrição (opcional)"
              placeholder="Ex.: Cortes clássicos e barba"
              error={errors.description?.message}
              {...register('description')}
            />
            <Input
              label="Endereço da unidade principal"
              placeholder="Rua, número, bairro, cidade - UF"
              error={errors.address?.message}
              {...register('address')}
            />
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep('type')}>
                Voltar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando…' : 'Criar negócio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
