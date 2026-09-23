import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { appointmentsApi } from '@/services/api/appointments'
import { staffApi } from '@/services/api/staff'
import { useAuth } from '@/app/providers/auth'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { AppointmentActions } from '@/components/appointments/appointment-actions'
import type { Appointment, AppointmentStatus } from '@/types'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7)

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-warning-50 text-amber-700 border border-warning-200' },
  CONFIRMED: { label: 'Confirmado', className: 'bg-primary-50 text-primary-700 border border-primary-200' },
  COMPLETED: { label: 'Concluído', className: 'bg-warm-100 text-warm-600 border border-warm-200' },
  CANCELLED: { label: 'Cancelado', className: 'bg-warm-50 text-warm-400 border border-warm-200 line-through' },
  NO_SHOW: { label: 'Não compareceu', className: 'bg-destructive-50 text-red-500 border border-destructive-200' },
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'day'>('week')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const weekStart = useMemo(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }, [selectedDate])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    d.setHours(23, 59, 59, 999)
    return d
  }, [weekStart])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  const { user } = useAuth()
  const { businessId } = useActiveBusiness()

  const { data: employees = [] } = useQuery({
    queryKey: ['business-employees', businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId,
  })

  const currentMembership = employees.find((m) => m.userId === user?.id)
  const currentRole = currentMembership?.role
  const currentMembershipId = currentMembership?.id

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', businessId, weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      if (!businessId) return []
      const res = await appointmentsApi.listBusiness(businessId, {
        dateFrom: weekStart.toISOString(),
        dateTo: weekEnd.toISOString(),
        limit: 100,
      })
      return res?.data || []
    },
    enabled: !!businessId,
  })

  const prevWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    setSelectedDate(d)
  }

  const nextWeek = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    setSelectedDate(d)
  }

  const goToToday = () => setSelectedDate(new Date())

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter((apt) => apt.startsAt.split('T')[0] === dateStr)
  }

  const getAppointmentsForHour = (date: Date, hour: number) => {
    return getAppointmentsForDay(date).filter((apt) => new Date(apt.startsAt).getHours() === hour)
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const formatDuration = (startsAt: string, endsAt: string) => {
    return Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
  }

  return (
    <>
      <PageHeader>
        <div>
          <PageTitle>Agendamentos</PageTitle>
          <p className="text-xs text-ink-muted mt-0.5">
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-warm-200 bg-white">
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors rounded-l-lg',
                view === 'week' ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:bg-warm-50'
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setView('day')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors rounded-r-lg',
                view === 'day' ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:bg-warm-50'
              )}
            >
              Dia
            </button>
          </div>
          <Link to="/appointments/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </Link>
        </div>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button onClick={prevWeek} className="btn-ghost !p-1.5">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={goToToday} className="btn-ghost text-xs">
                Hoje
              </button>
              <button onClick={nextWeek} className="btn-ghost !p-1.5">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm font-medium text-foreground">
              {weekStart.getDate()} {MONTHS[weekStart.getMonth()]} - {weekEnd.getDate()} {MONTHS[weekEnd.getMonth()]}
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="card overflow-hidden">
            {/* Day Headers */}
            <div className={cn('grid border-b border-warm-200', view === 'week' ? 'grid-cols-[4rem_repeat(7,1fr)]' : 'grid-cols-[4rem_1fr]')}>
              <div className="border-r border-warm-200 bg-warm-50" />
              {(view === 'week' ? weekDays : [selectedDate]).map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString()
                const dayApts = getAppointmentsForDay(day)
                return (
                  <div
                    key={i}
                    className={cn(
                      'border-r border-warm-200 px-2 py-3 text-center',
                      isToday ? 'bg-primary-50' : 'bg-warm-50'
                    )}
                  >
                    <p className={cn('text-xs', isToday ? 'text-primary-600 font-bold' : 'text-ink-muted')}>
                      {WEEKDAYS[day.getDay()]}
                    </p>
                    <p className={cn('text-lg font-bold', isToday ? 'text-primary-700' : 'text-foreground')}>
                      {day.getDate()}
                    </p>
                    {dayApts.length > 0 && (
                      <p className="text-xs text-primary-500 font-medium">
                        {dayApts.length} agendamento{dayApts.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time Grid */}
            <div className={cn('grid', view === 'week' ? 'grid-cols-[4rem_repeat(7,1fr)]' : 'grid-cols-[4rem_1fr]')}>
              {HOURS.map((hour) => (
                <div key={hour} className="contents">
                  <div className="border-r border-b border-warm-100 px-2 py-3 text-right">
                    <span className="text-xs text-ink-faint">{String(hour).padStart(2, '0')}:00</span>
                  </div>

                  {(view === 'week' ? weekDays : [selectedDate]).map((day, dayIdx) => {
                    const hourApts = getAppointmentsForHour(day, hour)
                    const isToday = day.toDateString() === new Date().toDateString()
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          'border-r border-b border-warm-100 min-h-[3rem] p-0.5',
                          isToday && 'bg-primary-50/30'
                        )}
                      >
                        {hourApts.map((apt) => {
                          const status = statusConfig[apt.status]
                          return (
                            <button
                              key={apt.id}
                              onClick={() => setSelectedAppointment(apt)}
                              className={cn(
                                'w-full rounded-lg p-1.5 text-left text-xs transition-all hover:shadow-sm',
                                status.className
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="font-bold">{formatTime(apt.startsAt)}</span>
                                <span className="text-[10px] opacity-70">
                                  {formatDuration(apt.startsAt, apt.endsAt)}min
                                </span>
                              </div>
                              {apt.service?.name && (
                                <p className="mt-0.5 truncate font-medium">{apt.service.name}</p>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {appointments.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum agendamento esta semana"
              description="Os agendamentos dos seus clientes aparecerão aqui."
              action={
                <Link to="/appointments/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Criar agendamento
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      </PageContent>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6 animate-in-scale">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground font-display">Detalhes</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="btn-ghost !p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                  <Clock className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {formatTime(selectedAppointment.startsAt)} - {formatTime(selectedAppointment.endsAt)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(selectedAppointment.startsAt).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              </div>

              {selectedAppointment.service && (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50">
                    <CalendarDays className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedAppointment.service.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatDuration(selectedAppointment.startsAt, selectedAppointment.endsAt)} minutos
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                  <User className="h-5 w-5 text-accent-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedAppointment.employee?.user?.name || 'Sem profissional'}
                  </p>
                  <p className="text-xs text-ink-muted">Profissional</p>
                </div>
              </div>

              <div className="pt-2">
                <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-medium', statusConfig[selectedAppointment.status].className)}>
                  {statusConfig[selectedAppointment.status].label}
                </span>
              </div>

              {selectedAppointment.cancelReason && (
                <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 text-xs text-ink-muted">
                  <span className="font-semibold text-ink">Motivo do cancelamento:</span> {selectedAppointment.cancelReason}
                </div>
              )}

              {currentRole && (
                <div className="pt-2 border-t border-warm-100">
                  <AppointmentActions
                    appointment={selectedAppointment}
                    role={currentRole}
                    membershipId={currentMembershipId}
                    onUpdated={(apt) => setSelectedAppointment(apt)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
