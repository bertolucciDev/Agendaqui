import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentsApi } from '@/services/api/appointments'
import { servicesApi } from '@/services/api/services'
import { staffApi } from '@/services/api/staff'
import { locationsApi } from '@/services/api/locations'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appointmentSchema, type AppointmentFormData } from '@/lib/validations'
import toast from 'react-hot-toast'
import { ArrowLeft, CalendarPlus } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function NewAppointmentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { businessId } = useActiveBusiness()

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services', businessId],
    queryFn: () => servicesApi.list(businessId!),
    enabled: !!businessId,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: AppointmentFormData) => {
      const service = services.find((s) => s.id === data.serviceId)
      const startsAt = new Date(`${data.date}T${data.time}:00`).toISOString()
      const endsAt = new Date(
        new Date(startsAt).getTime() + (service?.durationMinutes ?? 30) * 60000
      ).toISOString()
      return appointmentsApi.create(businessId!, {
        locationId: data.locationId,
        serviceId: data.serviceId,
        startsAt,
        endsAt,
        employeeMembershipId: data.employeeMembershipId || undefined,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Agendamento criado!')
      navigate('/appointments')
    },
    onError: () => toast.error('Erro ao criar agendamento'),
  })

  const onSubmit = (data: AppointmentFormData) => {
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
          <Link to="/appointments" className="btn-ghost !px-2" aria-label="Voltar para agenda">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <PageTitle>Novo agendamento</PageTitle>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in mx-auto max-w-lg">
          <Card>
            <div className="flex justify-center mb-4 pt-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                <CalendarPlus className="h-8 w-8 text-accent-500" />
              </div>
            </div>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label" htmlFor="appointment-location">Local</label>
                  <select
                    id="appointment-location"
                    className={cn('input mt-1.5', errors.locationId && 'border-red-400')}
                    {...register('locationId')}
                  >
                    <option value="">Selecione...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                  {errors.locationId && <p className="mt-1 text-xs text-red-500">{errors.locationId.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="appointment-service">Serviço *</label>
                  <select
                    id="appointment-service"
                    className={cn('input mt-1.5', errors.serviceId && 'border-red-400')}
                    {...register('serviceId')}
                  >
                    <option value="">Selecione...</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>{svc.name}</option>
                    ))}
                  </select>
                  {errors.serviceId && <p className="mt-1 text-xs text-red-500">{errors.serviceId.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="appointment-staff">Profissional</label>
                  <select
                    id="appointment-staff"
                    className={cn('input mt-1.5', errors.employeeMembershipId && 'border-red-400')}
                    {...register('employeeMembershipId')}
                  >
                    <option value="">Qualquer disponível</option>
                    {staff.map((m) => (
                      <option key={m.id} value={m.id}>{m.user?.name ?? m.position}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Data *"
                    type="date"
                    error={errors.date?.message}
                    {...register('date')}
                  />
                  <Input
                    label="Horário *"
                    type="time"
                    error={errors.time?.message}
                    {...register('time')}
                  />
                </div>

                <Input
                  label="Cliente"
                  placeholder="Nome do cliente"
                  error={errors.clientName?.message}
                  {...register('clientName')}
                />

                <Input
                  label="Telefone do cliente"
                  placeholder="(11) 99999-0000"
                  error={errors.clientPhone?.message}
                  {...register('clientPhone')}
                />

                <Button
                  type="submit"
                  loading={createMutation.isPending}
                  className="w-full"
                >
                  Criar agendamento
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
