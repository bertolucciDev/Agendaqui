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
  PENDING: { label: 'Pendente', color: 'bg-peach-100 text-peach-500' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-brand-100 text-brand-600' },
  COMPLETED: { label: 'Concluído', color: 'bg-warm-200 text-warm-700' },
  NO_SHOW: { label: 'Não compareceu', color: 'bg-destructive-50 text-red-500' },
  CANCELLED: { label: 'Cancelado', color: 'bg-warm-100 text-warm-500' },
}

export function Timeline({ appointments = [], role, membershipId }: TimelineProps) {
  if (appointments.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Próximos agendamentos</h2>
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warm-100">
            <CalendarDays className="h-5 w-5 text-warm-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">Nenhum agendamento hoje</p>
          <p className="mt-1 text-xs text-ink-faint">Aproveite para organizar seu negócio!</p>
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
              className="flex items-start gap-3 rounded-xl border border-warm-200 p-3 transition-all duration-200 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-50 text-center">
                <Clock className="h-3 w-3 text-brand-500" />
                <span className="text-xs font-bold text-brand-700">{time}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {apt.client?.name || 'Cliente'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Scissors className="h-3 w-3 text-ink-faint" />
                  <span className="text-xs text-ink-muted">{apt.service?.name || 'Agendamento'}</span>
                  <span className="text-xs text-ink-faint">· {duration}min</span>
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