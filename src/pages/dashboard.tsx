import { CalendarDays, Building2, Scissors, Users, DollarSign, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MiniCalendar } from '@/components/dashboard/mini-calendar'
import { Timeline } from '@/components/dashboard/timeline'
import { StatCard } from '@/components/dashboard/stat-card'
import { appointmentsApi } from '@/services/api/appointments'
import { staffApi } from '@/services/api/staff'
import { useAuth } from '@/app/providers/auth'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const { user } = useAuth()
  const { businessId, businesses } = useActiveBusiness()

  const { data: employees = [] } = useQuery({
    queryKey: ['business-employees', businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId,
  })

  const currentMembership = employees.find((m) => m.userId === user?.id)
  const currentRole = currentMembership?.role
  const currentMembershipId = currentMembership?.id

  const { data: todayData } = useQuery({
    queryKey: ['appointments-today', businessId, today],
    queryFn: () =>
      appointmentsApi.listBusiness(businessId!, {
        dateFrom: today,
        dateTo: today,
        limit: 100,
      }),
    enabled: !!businessId,
  })

  const todayAppointments = todayData?.data ?? []
  const todayCount = todayAppointments.length
  const todayRevenue = todayAppointments
    .filter((a) => a.status === 'COMPLETED' || a.status === 'CONFIRMED')
    .reduce((sum, a) => sum + (a.service?.priceCents ?? 0), 0)
  const uniqueClients = new Set(todayAppointments.map((a) => a.clientId)).size

  const appointmentDays = todayAppointments.map((a) => new Date(a.startsAt).getDate())

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Dashboard</PageTitle>
          <p className="text-xs text-ink-muted mt-0.5">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in space-y-5">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={CalendarDays}
              label="Agendamentos hoje"
              value={String(todayCount)}
              color="primary"
            />
            <StatCard
              icon={DollarSign}
              label="Faturamento do dia"
              value={`R$ ${(todayRevenue / 100).toFixed(2).replace('.', ',')}`}
              color="success"
            />
            <StatCard
              icon={Users}
              label="Clientes atendidos"
              value={String(uniqueClients)}
              color="accent"
            />
            <StatCard
              icon={Building2}
              label="Negócios ativos"
              value={String(businesses.length)}
              color="warning"
            />
          </div>

          {/* Calendar + Timeline */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <MiniCalendar appointmentDays={appointmentDays} />
            </div>
            <div className="lg:col-span-2">
              <Timeline
                appointments={todayAppointments}
                role={currentRole}
                membershipId={currentMembershipId}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Ações rápidas</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                icon={Building2}
                label="Novo negócio"
                href="/businesses/new"
                color="primary"
              />
              <QuickAction
                icon={Scissors}
                label="Novo serviço"
                href="/services/new"
                color="success"
              />
              <QuickAction
                icon={Users}
                label="Adicionar funcionário"
                href="/staff/new"
                color="accent"
              />
              <QuickAction
                icon={CalendarDays}
                label="Novo agendamento"
                href="/appointments/new"
                color="warning"
              />
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}

function QuickAction({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: React.ElementType
  label: string
  href: string
  color: 'primary' | 'success' | 'accent' | 'warning'
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600 hover:bg-primary-100 border-primary-100',
    success: 'bg-success-50 text-green-600 hover:bg-success-100 border-success-100',
    accent: 'bg-accent text-accent-foreground hover:bg-accent-100 border-accent-100',
    warning: 'bg-warning-50 text-amber-600 hover:bg-warning-100 border-warning-100',
  }

  return (
    <Link
      to={href}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-150 hover:shadow-sm ${colorMap[color]}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 opacity-50" />
    </Link>
  )
}
