import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { servicesApi } from '@/services/api/services'
import { categoriesApi } from '@/services/api/categories'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { serviceSchema, type ServiceFormData } from '@/lib/validations'
import { notify } from '@/lib/notify'
import { ArrowLeft, Scissors } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

export default function NewServicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { businessId } = useActiveBusiness()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { durationMinutes: 30 },
  })

  const createMutation = useMutation({
    mutationFn: (data: ServiceFormData) =>
      servicesApi.create(businessId!, {
        name: data.name,
        categoryId: data.categoryId,
        /* O formulário coleta o preço em REAIS; a API trabalha em centavos. */
        priceCents: Math.round(data.price * 100),
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes || undefined,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      notify.success('Serviço criado!')
      navigate('/services')
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => createMutation.mutate() }),
  })

  const onSubmit = (data: ServiceFormData) => {
    if (!businessId) {
      notify.warning('Cadastre um negócio primeiro')
      return
    }
    createMutation.mutate(data)
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link to="/services" className="btn-ghost !px-2" aria-label="Voltar para serviços">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Novo serviço</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-lg">
          <Card>
            <div className="mx-auto mb-4 flex justify-center pt-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-soft">
                <Scissors className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nome do serviço *"
                  placeholder="Ex: Corte masculino"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Select
                  label="Categoria *"
                  placeholder="Selecione..."
                  options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                  error={errors.categoryId?.message}
                  {...register('categoryId')}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Preço (R$) *"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    error={errors.price?.message}
                    {...register('price', { valueAsNumber: true })}
                  />
                  <Input
                    label="Duração (min) *"
                    type="number"
                    min="15"
                    step="5"
                    placeholder="30"
                    error={errors.durationMinutes?.message}
                    {...register('durationMinutes', { valueAsNumber: true })}
                  />
                </div>

                <Input
                  label="Intervalo entre atendimentos (min)"
                  type="number"
                  min="0"
                  step="5"
                  placeholder="0"
                  hint="Tempo reservado após cada atendimento, usado para gerar os horários."
                  error={errors.bufferMinutes?.message}
                  {...register('bufferMinutes', { valueAsNumber: true })}
                />

                <div>
                  <label className="label" htmlFor="service-description">
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="service-description"
                    className="input mt-1.5 min-h-[80px]"
                    placeholder="Sobre o serviço..."
                    {...register('description')}
                  />
                </div>

                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  className="w-full"
                >
                  Criar serviço
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
