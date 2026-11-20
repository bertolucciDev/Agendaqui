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
import { notify } from '@/lib/notify'
import { ArrowLeft, CalendarPlus, Info } from 'lucide-react'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function NewAppointmentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { businessId, activeMode } = useActiveBusiness()

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeMode, businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId,
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services', activeMode, businessId],
    queryFn: () => servicesApi.list(businessId!),
    enabled: !!businessId,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', activeMode, businessId],
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
      /* O slot gerado pelo backend tem duração `durationMinutes + bufferMinutes`.
       * Sem o buffer o `endsAt` não casa com nenhum slot e o agendamento é
       * rejeitado com "profissional não disponível". */
      const slotMinutes = (service?.durationMinutes ?? 30) + (service?.bufferMinutes ?? 0)
      const endsAt = new Date(new Date(startsAt).getTime() + slotMinutes * 60000).toISOString()

      return appointmentsApi.create(businessId!, {
        locationId: data.locationId,
        serviceId: data.serviceId,
        startsAt,
        endsAt,
        employeeMembershipId: data.employeeMembershipId || undefined,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
      void queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
      notify.success('Agendamento criado!')
      navigate('/appointments')
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => createMutation.mutate() }),
  })

  const onSubmit = (data: AppointmentFormData) => {
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
                  <label className="label" htmlFor="appointment-location">
                    Local
                  </label>
                  <select
                    id="appointment-location"
                    className="input mt-1.5"
                    aria-invalid={errors.locationId ? true : undefined}
                    {...register('locationId')}
                  >
                    <option value="">Selecione...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {errors.locationId && (
                    <p className="mt-1 text-xs text-destructive-soft-fg" role="alert">
                      {errors.locationId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="appointment-service">
                    Serviço *
                  </label>
                  <select
                    id="appointment-service"
                    className="input mt-1.5"
                    aria-invalid={errors.serviceId ? true : undefined}
                    {...register('serviceId')}
                  >
                    <option value="">Selecione...</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                  {errors.serviceId && (
                    <p className="mt-1 text-xs text-destructive-soft-fg" role="alert">
                      {errors.serviceId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="appointment-staff">
                    Profissional
                  </label>
                  <select
                    id="appointment-staff"
                    className="input mt-1.5"
                    {...register('employeeMembershipId')}
                  >
                    <option value="">Qualquer disponível</option>
                    {staff.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.name ?? m.position}
                      </option>
                    ))}
                  </select>
                  <p className="helper-text">
                    Sem profissional, o servidor escolhe o primeiro disponível para o horário.
                  </p>
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

                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">
                    O agendamento fica vinculado à sua conta. Para registrar um cliente
                    específico, envie o link público de agendamento para que ele mesmo
                    reserve o horário.
                  </p>
                </div>

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
