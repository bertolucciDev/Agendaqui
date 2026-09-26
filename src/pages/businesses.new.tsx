import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { businessesApi } from '@/services/api/businesses'
import { categoriesApi } from '@/services/api/categories'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { businessSchema, type BusinessFormData } from '@/lib/validations'
import { maskCpfCnpj, maskPhone, unmask } from '@/lib/masks'
import { useCepLookup } from '@/hooks/use-cep-lookup'
import { maskCep } from '@/lib/masks'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, MapPin } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NewBusinessPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [documentDisplay, setDocumentDisplay] = useState('')
  const [phoneDisplay, setPhoneDisplay] = useState('')
  const [cepDisplay, setCepDisplay] = useState('')
  const [locationPhoneDisplay, setLocationPhoneDisplay] = useState('')

  const { lookupCep, isLoading: isLoadingCep } = useCepLookup()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      type: 'COMPANY',
      timezone: 'America/Sao_Paulo',
      attendanceType: 'AT_LOCATION',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: BusinessFormData) => {
      const payload = {
        name: data.name,
        document: unmask(data.document),
        type: data.type,
        categoryId: data.categoryId,
        locationName: data.locationName,
        address: `${data.street}, ${data.number} - ${data.neighborhood}, ${data.city} - ${data.state}, ${data.cep}`,
        timezone: data.timezone,
        attendanceType: data.attendanceType,
        phone: data.phone ? unmask(data.phone) : undefined,
        description: data.description,
      }

      const business = await businessesApi.create(payload)
      return business
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.success('Negócio e primeira unidade criados!')
      navigate('/businesses')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (msg?.includes('categoryId')) {
        toast.error('Selecione uma categoria válida')
      } else if (msg?.includes('document')) {
        toast.error('CPF/CNPJ já cadastrado')
      } else {
        toast.error(msg || 'Erro ao criar negócio')
      }
    },
  })

  const onSubmit = (data: BusinessFormData) => {
    setIsSubmitting(true)
    createMutation.mutate(data)
  }

  const handleCepChange = (value: string) => {
    const masked = maskCep(value)
    setCepDisplay(masked)
    setValue('cep', masked, { shouldValidate: true })
  }

  const handleCepBlur = async () => {
    const cepDigits = watch('cep').replace(/\D/g, '')
    if (cepDigits.length !== 8) return

    const data = await lookupCep(watch('cep'))
    if (data) {
      setValue('street', data.street)
      setValue('neighborhood', data.neighborhood)
      setValue('city', data.city)
      setValue('state', data.state)
      toast.success('Endereço preenchido automaticamente!')
    } else {
      toast.error('CEP não encontrado')
    }
  }

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link to="/businesses" className="btn-ghost !px-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Novo negócio</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-600" />
                Dados do negócio
              </CardTitle>
              <CardDescription>
                Preencha as informações principais do seu negócio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nome do negócio *"
                  placeholder="Ex: Barbearia Elite"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="CPF/CNPJ *"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={documentDisplay}
                  onChange={(e) => {
                    const masked = maskCpfCnpj(e.target.value)
                    setDocumentDisplay(masked)
                    setValue('document', unmask(masked), { shouldValidate: true })
                  }}
                  error={errors.document?.message}
                />

                <div>
                  <label className="label">Tipo *</label>
                  <div className="flex gap-2 mt-1.5">
                    {(['COMPANY', 'INDIVIDUAL'] as const).map((type) => (
                      <label key={type} className="flex-1">
                        <input type="radio" value={type} className="sr-only peer" {...register('type')} />
                        <div className="cursor-pointer rounded-lg border border-border-strong p-3 text-center text-sm font-medium transition-all peer-checked:border-primary-400 peer-checked:bg-primary-soft peer-checked:text-primary-soft-fg">
                          {type === 'COMPANY' ? 'Empresa' : 'Individual'}
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.type && <p className="mt-1 text-xs text-destructive-soft-fg">{errors.type.message}</p>}
                </div>

                <div>
                  <label className="label">Categoria *</label>
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

                <Input
                  label="Telefone do negócio (opcional)"
                  placeholder="(11) 99999-9999"
                  type="tel"
                  value={phoneDisplay}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value)
                    setPhoneDisplay(masked)
                    setValue('phone', unmask(masked), { shouldValidate: true })
                  }}
                />

                <div>
                  <label className="label">Descrição (opcional)</label>
                  <textarea
                    className="input mt-1.5 min-h-[80px]"
                    placeholder="Sobre seu negócio..."
                    {...register('description')}
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent-500" />
                Primeira unidade (local)
              </CardTitle>
              <CardDescription>
                Endereço da primeira unidade do negócio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Nome da unidade *"
                  placeholder="Ex: Matriz, Filial 01"
                  error={errors.locationName?.message}
                  {...register('locationName')}
                />

                <Input
                  label="CEP *"
                  placeholder="00000-000"
                  value={cepDisplay}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={handleCepBlur}
                  maxLength={9}
                  hint={isLoadingCep ? 'Buscando...' : undefined}
                  error={errors.cep?.message}
                />

                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <Input
                    label="Rua *"
                    placeholder="Rua, avenida..."
                    error={errors.street?.message}
                    {...register('street')}
                  />
                  <Input
                    label="Número *"
                    placeholder="Nº"
                    error={errors.number?.message}
                    {...register('number')}
                  />
                </div>

                <Input
                  label="Bairro *"
                  placeholder="Bairro"
                  error={errors.neighborhood?.message}
                  {...register('neighborhood')}
                />

                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <Input
                    label="Cidade *"
                    placeholder="Cidade"
                    error={errors.city?.message}
                    {...register('city')}
                  />
                  <Input
                    label="UF *"
                    placeholder="UF"
                    maxLength={2}
                    error={errors.state?.message}
                    {...register('state', { setValueAs: (v: string) => v.toUpperCase() })}
                  />
                </div>

                <Input
                  label="Telefone da unidade (opcional)"
                  placeholder="(11) 99999-9999"
                  type="tel"
                  value={locationPhoneDisplay}
                  onChange={(e) => {
                    const masked = maskPhone(e.target.value)
                    setLocationPhoneDisplay(masked)
                    // We'll add a separate field for location phone in the payload
                  }}
                />

                <div>
                  <label className="label">Tipo de atendimento *</label>
                  <div className="flex gap-2 mt-1.5">
                    {([
                      { value: 'AT_LOCATION', label: 'No local' },
                      { value: 'AT_CUSTOMER', label: 'No cliente' },
                      { value: 'BOTH', label: 'Ambos' },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="flex-1">
                        <input type="radio" value={opt.value} className="sr-only peer" {...register('attendanceType')} />
                        <div className="cursor-pointer rounded-lg border border-border-strong p-3 text-center text-sm font-medium transition-all peer-checked:border-primary-400 peer-checked:bg-primary-soft peer-checked:text-primary-soft-fg">
                          {opt.label}
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.attendanceType && <p className="mt-1 text-xs text-destructive-soft-fg">{errors.attendanceType.message}</p>}
                </div>

                <div>
                  <label className="label">Fuso horário *</label>
                  <select
                    className="input mt-1.5"
                    {...register('timezone')}
                  >
                    <option value="America/Sao_Paulo">Horário de Brasília</option>
                    <option value="America/Manaus">Horário da Amazônia</option>
                    <option value="America/Noronha">Horário de Fernando de Noronha</option>
                  </select>
                  {errors.timezone && <p className="mt-1 text-xs text-destructive-soft-fg">{errors.timezone.message}</p>}
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting}
                  className="w-full"
                >
                  Criar negócio e unidade
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}