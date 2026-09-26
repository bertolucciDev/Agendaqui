import { Clock, Scissors } from 'lucide-react'
import { CalendarDays } from 'lucide-react'
import type { Appointment, MembershipRole } from '@/types'
import { AppointmentActions } from '@/components/appointments/appointment-actions'

interface TimelineProps {
  appointments?: Appointment[]
  role?: MembershipRole
  membershipId?: string
}

const statusConfig: Record<
  Appointment['status'],
  { label: string; color: string }
> = {
  PENDING: { label: 'Pendente', color: 'bg-warning-soft text-warning-soft-fg' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-primary-soft text-primary-accent' },
  COMPLETED: { label: 'Concluído', color: 'bg-border text-foreground' },
  NO_SHOW: { label: 'Não compareceu', color: 'bg-destructive-soft text-destructive-soft-fg' },
  CANCELLED: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
}

export function Timeline({ appointments = [], role, membershipId }: TimelineProps) {
  if (appointments.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Próximos agendamentos</h2>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">Nenhum agendamento hoje</p>
          <p className="mt-1 text-xs text-muted-foreground">Aproveite para organizar seu negócio!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h2 className="text-sm font-semibold text-ink mb-4">Próximos agendamentos</h2>
      <div className="space-y-3">
        {appointments.map((apt) => {
          const status = statusConfig[apt.status]
          const time = `${String(new Date(apt.startsAt).getHours()).padStart(2, '0')}:${String(
            new Date(apt.startsAt).getMinutes()
          ).padStart(2, '0')}`
          const duration = Math.round(
            (new Date(apt.endsAt).getTime() - new Date(apt.startsAt).getTime()) / 60000
          )
          return (
            <div
              key={apt.id}
              className="flex items-start gap-3 rounded-xl border border-border p-3 transition-all duration-200 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-primary-soft text-center">
                <Clock className="h-3 w-3 text-primary-accent" />
                <span className="text-xs font-bold text-primary-soft-fg">{time}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {apt.client?.name || 'Cliente'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Scissors className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{apt.service?.name || 'Agendamento'}</span>
                  <span className="text-xs text-muted-foreground">· {duration}min</span>
                </div>
                <span className={`badge text-xs mt-1.5 ${status.color}`}>
                  {status.label}
                </span>
              </div>

              {role && (
                <div className="shrink-0">
                  <AppointmentActions appointment={apt} role={role} membershipId={membershipId} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}