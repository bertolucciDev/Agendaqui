import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/services/api/locations'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { locationSchema, type LocationFormData } from '@/lib/validations'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NewLocationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { businessId } = useActiveBusiness()

  const { register, handleSubmit, formState: { errors } } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: { timezone: 'America/Sao_Paulo', attendanceType: 'AT_LOCATION' },
  })

  const createMutation = useMutation({
    mutationFn: (data: LocationFormData) =>
      locationsApi.create(businessId!, {
        name: data.name,
        address: `${data.street}, ${data.number} - ${data.neighborhood}, ${data.city} - ${data.state}, ${data.cep}`,
        timezone: data.timezone,
        attendanceType: data.attendanceType,
        phone: data.phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Local cadastrado!')
      navigate('/locations')
    },
    onError: () => toast.error('Erro ao cadastrar local'),
  })

  const onSubmit = (data: LocationFormData) => {
    if (!businessId) {
      toast.error('Cadastre um negócio primeiro')
      return
    }
    createMutation.mutate(data)
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link to="/locations" className="btn-ghost !px-2" aria-label="Voltar para locais">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Novo local</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-lg">
          <Card>
            <div className="flex justify-center mb-4 pt-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                <MapPin className="h-8 w-8 text-accent-500" />
              </div>
            </div>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nome do local *"
                  placeholder="Ex: Unidade Centro"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      label="Rua *"
                      placeholder="Nome da rua"
                      error={errors.street?.message}
                      {...register('street')}
                    />
                  </div>
                  <Input
                    label="Número *"
                    placeholder="123"
                    error={errors.number?.message}
                    {...register('number')}
                  />
                </div>

                <Input
                  label="Bairro *"
                  placeholder="Centro"
                  error={errors.neighborhood?.message}
                  {...register('neighborhood')}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Input
                      label="Cidade *"
                      placeholder="São Paulo"
                      error={errors.city?.message}
                      {...register('city')}
                    />
                  </div>
                  <Input
                    label="UF *"
                    placeholder="SP"
                    maxLength={2}
                    error={errors.state?.message}
                    {...register('state')}
                  />
                </div>

                <Input
                  label="CEP *"
                  placeholder="00000-000"
                  maxLength={9}
                  error={errors.cep?.message}
                  {...register('cep')}
                />

                <Input
                  label="Telefone"
                  placeholder="(11) 99999-0000"
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <div>
                  <label className="label" htmlFor="attendanceType">Tipo de atendimento</label>
                  <select
                    id="attendanceType"
                    className={cn('input mt-1.5', errors.attendanceType && 'border-red-400')}
                    {...register('attendanceType')}
                  >
                    <option value="AT_LOCATION">No local</option>
                    <option value="AT_CUSTOMER">No cliente</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                  {errors.attendanceType && <p className="mt-1 text-xs text-red-500">{errors.attendanceType.message}</p>}
                </div>

                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  className="w-full"
                >
                  Salvar local
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
