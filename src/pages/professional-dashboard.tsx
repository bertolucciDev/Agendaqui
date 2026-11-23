import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, MapPin, UserRound } from 'lucide-react'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useWorkspace } from '@/app/providers/workspace'
import { appointmentsApi } from '@/services/api/appointments'
import { AppointmentActions } from '@/components/appointments/appointment-actions'
import { StatCard } from '@/components/dashboard/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import type { Appointment, AppointmentStatus } from '@/types'

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

function localDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function AppointmentCard({ appointment, membershipId }: { appointment: Appointment; membershipId?: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary-soft-fg">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="mt-0.5 text-xs font-bold">{formatTime(appointment.startsAt)}</span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {appointment.service?.name ?? 'Atendimento'}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{appointment.customer?.name ?? 'Cliente'}</span>
            </p>
            {appointment.location?.name && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{appointment.location.name}</span>
              </p>
            )}
          </div>
        </div>
        <Badge variant={appointment.status === 'CONFIRMED' ? 'success' : appointment.status === 'PENDING' ? 'warning' : 'neutral'}>
          {statusLabels[appointment.status]}
        </Badge>
      </div>
      {(appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') && (
        <div className="mt-3 border-t border-border pt-3">
        <AppointmentActions
          appointment={appointment}
          role="EMPLOYEE"
          membershipId={membershipId}
          compact
        />
        </div>
      )}
    </article>
  )
}

export default function ProfessionalDashboardPage() {
  const { businessId, business } = useActiveBusiness()
  const { activeMembership } = useWorkspace()
  const now = new Date()
  const todayKey = localDayKey(now)
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999)

  const {
    data: appointments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['professional-agenda', businessId, todayKey],
    queryFn: () =>
      appointmentsApi.listProfessionalAgenda({
        businessId: businessId!,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        limit: 100,
      }),
    enabled: !!businessId && activeMembership?.role === 'EMPLOYEE',
  })

  const todayAppointments = appointments.filter(
    (appointment) => localDayKey(new Date(appointment.startsAt)) === todayKey
  )
  const upcomingAppointments = appointments.filter((appointment) => {
    const startsAt = new Date(appointment.startsAt)
    return (
      localDayKey(startsAt) !== todayKey &&
      startsAt >= now &&
      (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED')
    )
  })
  const nextAppointment = appointments.find(
    (appointment) =>
      new Date(appointment.startsAt) >= now &&
      (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED')
  )

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Minha agenda</PageTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {business?.name ? `${business.name} · ` : ''}
            {now.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Link to="/appointments">
          <Button size="sm" variant="outline">
            <CalendarDays className="h-4 w-4" />
            Ver agenda
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={CalendarDays}
              label="Atendimentos hoje"
              value={isLoading ? '—' : String(todayAppointments.length)}
              color="primary"
            />
            <StatCard
              icon={Clock}
              label="Próximo atendimento"
              value={isLoading ? '—' : nextAppointment ? formatTime(nextAppointment.startsAt) : 'Nenhum'}
              color="accent"
            />
          </div>

          {!activeMembership || activeMembership.role !== 'EMPLOYEE' ? (
            <div className="card p-6 text-sm text-muted-foreground">
              Seu vínculo profissional não está ativo neste negócio.
            </div>
          ) : isLoading ? (
            <div className="card p-6 text-sm text-muted-foreground" role="status">
              Carregando sua agenda…
            </div>
          ) : isError ? (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
              <p className="text-sm text-muted-foreground">Não foi possível carregar sua agenda.</p>
              <Button size="sm" variant="outline" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <section className="space-y-3" aria-labelledby="today-appointments-title">
                <div className="flex items-center justify-between">
                  <h2 id="today-appointments-title" className="text-sm font-semibold text-foreground">
                    Atendimentos de hoje
                  </h2>
                  <span className="text-xs text-muted-foreground">{todayAppointments.length}</span>
                </div>
                {todayAppointments.length === 0 ? (
                  <div className="card p-6 text-sm text-muted-foreground">
                    Você não tem atendimentos marcados para hoje.
                  </div>
                ) : (
                  todayAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      membershipId={appointment.employeeMembershipId}
                    />
                  ))
                )}
              </section>

              <section className="space-y-3" aria-labelledby="upcoming-appointments-title">
                <div className="flex items-center justify-between">
                  <h2 id="upcoming-appointments-title" className="text-sm font-semibold text-foreground">
                    Próximos atendimentos
                  </h2>
                  <span className="text-xs text-muted-foreground">Próximos 7 dias</span>
                </div>
                {upcomingAppointments.length === 0 ? (
                  <div className="card p-6 text-sm text-muted-foreground">
                    Não há outros atendimentos confirmados ou pendentes nesta semana.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id}>
                        <p className="mb-1 mt-3 text-xs font-medium capitalize text-muted-foreground">
                          {new Date(appointment.startsAt).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                        <AppointmentCard
                          appointment={appointment}
                          membershipId={appointment.employeeMembershipId}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </PageContent>
    </>
  )
}
