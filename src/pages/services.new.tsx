import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { servicesApi } from '@/services/api/services'
import { categoriesApi } from '@/services/api/categories'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { serviceSchema, type ServiceFormData } from '@/lib/validations'
import toast from 'react-hot-toast'
import { ArrowLeft, Scissors } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NewServicePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    mutationFn: (data: ServiceFormData) => servicesApi.create(businessId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Serviço criado!')
      navigate('/services')
    },
    onError: () => toast.error('Erro ao criar serviço'),
  })

  const onSubmit = (data: ServiceFormData) => {
    if (!businessId) {
      toast.error('Cadastre um negócio primeiro')
      return
    }
    setIsSubmitting(true)
    createMutation.mutate(data)
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link to="/services" className="btn-ghost !px-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Novo serviço</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-lg">
          <Card>
            <div className="flex justify-center mb-4 pt-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-soft mx-auto">
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

                <div>
                  <label className="label">Categoria</label>
                  <select
                    className={cn('input mt-1.5', errors.categoryId && 'border-red-400')}
                    {...register('categoryId')}
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="mt-1 text-xs text-destructive-soft-fg">{errors.categoryId.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Preço (R$)"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    error={errors.priceCents?.message}
                    {...register('priceCents', { valueAsNumber: true })}
                  />
                  <Input
                    label="Duração (min)"
                    type="number"
                    placeholder="30"
                    error={errors.durationMinutes?.message}
                    {...register('durationMinutes', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <label className="label">Descrição (opcional)</label>
                  <textarea
                    className="input mt-1.5 min-h-[80px]"
                    placeholder="Sobre o serviço..."
                    {...register('description')}
                  />
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
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
