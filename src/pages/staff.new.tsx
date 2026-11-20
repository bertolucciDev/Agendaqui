import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { staffApi } from '@/services/api/staff'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { staffSchema, type StaffFormData } from '@/lib/validations'
import { notify } from '@/lib/notify'
import { ArrowLeft, Users } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NewStaffPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { businessId, business } = useActiveBusiness()

  /**
   * Locais do negócio. As rotas de leitura (`businesses/:slug/locations`) são
   * indexadas por slug, então o catálogo é resolvido pelo id do negócio.
   */
  const { data: catalog } = useQuery({
    queryKey: ['business-catalog', businessId, business?.name],
    queryFn: () => staffApi.getBusinessCatalog(businessId!, business?.name),
    enabled: !!businessId,
    staleTime: 5 * 60_000,
  })

  const locations = catalog?.locations ?? []

  const { register, handleSubmit, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'EMPLOYEE' },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: StaffFormData) =>
      staffApi.inviteEmployee(businessId!, data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      notify.success(
        result?.inviteId
          ? 'Convite enviado! O funcionário recebeu o código por e-mail.'
          : 'Convite enviado!'
      )
      navigate('/staff')
    },
    onError: (err: unknown) => notify.error(err),
  })

  const onSubmit = (data: StaffFormData) => {
    if (!businessId) {
      notify.warning('Cadastre um negócio primeiro')
      return
    }
    inviteMutation.mutate(data)
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link to="/staff" className="btn-ghost !px-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Adicionar funcionário</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-lg">
          <Card>
            <div className="flex justify-center mb-4 pt-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent mx-auto">
                <Users className="h-8 w-8 text-accent-500" />
              </div>
            </div>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="E-mail do funcionário *"
                  type="email"
                  placeholder="funcionario@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <div>
                  <label className="label">Local</label>
                  <select
                    className={cn('input mt-1.5', errors.locationId && 'border-red-400')}
                    {...register('locationId')}
                  >
                    <option value="">Selecione...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  {errors.locationId && <p className="mt-1 text-xs text-destructive-soft-fg">{errors.locationId.message}</p>}
                </div>

                <Input
                  label="Cargo *"
                  placeholder="Ex: Barbeiro"
                  error={errors.position?.message}
                  {...register('position')}
                />

                <div>
                  <label className="label">Nível de acesso</label>
                  <div className="flex gap-2 mt-1.5">
                    {(['MANAGER', 'EMPLOYEE'] as const).map((role) => (
                      <label key={role} className="flex-1">
                        <input type="radio" value={role} className="sr-only peer" {...register('role')} />
                        <div className="cursor-pointer rounded-lg border border-border-strong p-3 text-center text-sm font-medium transition-all peer-checked:border-primary-400 peer-checked:bg-primary-soft peer-checked:text-primary-soft-fg">
                          {role === 'MANAGER' ? 'Gerente' : 'Funcionário'}
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O convite é enviado por e-mail com um código de aceite.
                  </p>
                </div>

                <Button
                  type="submit"
                  loading={inviteMutation.isPending}
                  disabled={!businessId || locations.length === 0}
                  className="w-full"
                >
                  Enviar convite
                </Button>
                {locations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Cadastre um local no negócio antes de convidar alguém.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
