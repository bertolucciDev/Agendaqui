import { CalendarDays, CheckCircle2, Clock, Scissors, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useWorkspace } from '@/app/providers/workspace'
import { Timeline } from '@/components/dashboard/timeline'
import { StatCard } from '@/components/dashboard/stat-card'
import { appointmentsApi } from '@/services/api/appointments'
import { staffApi } from '@/services/api/staff'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function ManagerDashboardPage() {
  const { businessId, business } = useActiveBusiness()
  const { activeMode, activeMembership } = useWorkspace()
  const now = new Date()
  const today = localDateKey(now)

  const appointmentsQuery = useQuery({
    queryKey: ['appointments-today', activeMode, businessId, today],
    queryFn: () =>
      appointmentsApi.listBusiness(businessId!, {
        dateFrom: today,
        dateTo: today,
        limit: 100,
      }),
    enabled: !!businessId && activeMembership?.role === 'MANAGER',
  })

  const staffQuery = useQuery({
    queryKey: ['business-employees', activeMode, businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId && activeMembership?.role === 'MANAGER',
  })

  const appointments = appointmentsQuery.data?.data ?? []
  const pendingCount = appointments.filter((appointment) => appointment.status === 'PENDING').length
  const activeProfessionalCount =
    staffQuery.data?.filter((member) => member.role === 'EMPLOYEE' && member.active).length ?? 0

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Operação do negócio</PageTitle>
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
            Abrir agenda
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={CalendarDays}
              label="Atendimentos hoje"
              value={appointmentsQuery.isPending ? '—' : String(appointments.length)}
              color="primary"
            />
            <StatCard
              icon={Clock}
              label="Aguardando confirmação"
              value={appointmentsQuery.isPending ? '—' : String(pendingCount)}
              color="warning"
            />
            <StatCard
              icon={Users}
              label="Profissionais ativos"
              value={staffQuery.isPending ? '—' : String(activeProfessionalCount)}
              color="accent"
            />
          </div>

          {appointmentsQuery.isError ? (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-muted-foreground">Não foi possível carregar a agenda da equipe.</p>
              <Button size="sm" variant="outline" onClick={() => void appointmentsQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : appointmentsQuery.isPending ? (
            <div className="card p-5 text-sm text-muted-foreground" role="status">
              Carregando a agenda da equipe…
            </div>
          ) : (
            <Timeline
              appointments={appointments}
              role="MANAGER"
              membershipId={activeMembership?.id}
            />
          )}

          {staffQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              Não foi possível carregar a equipe. Tente novamente mais tarde.
            </p>
          )}

          <section className="card p-5" aria-labelledby="manager-actions-title">
            <h2 id="manager-actions-title" className="mb-4 text-sm font-semibold text-foreground font-display">
              Acesso rápido
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <ManagerAction
                icon={CalendarDays}
                label="Ver agendamentos"
                description="Acompanhe a agenda e as confirmações."
                href="/appointments"
              />
              <ManagerAction
                icon={Users}
                label="Gerenciar equipe"
                description="Consulte os profissionais do negócio."
                href="/staff"
              />
              <ManagerAction
                icon={Scissors}
                label="Gerenciar serviços"
                description="Atualize os serviços oferecidos."
                href="/services"
              />
            </div>
            {pendingCount > 0 && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-warning-soft-fg" aria-hidden="true" />
                Há {pendingCount} agendamento(s) aguardando confirmação na agenda de hoje.
              </p>
            )}
          </section>
        </div>
      </PageContent>
    </>
  )
}

function ManagerAction({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ElementType
  label: string
  description: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary-300 hover:bg-primary-soft"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-accent" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
