import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, X, Ban, UserMinus } from 'lucide-react'
import { appointmentsApi } from '@/services/api/appointments'
import type { Appointment, MembershipRole } from '@/types'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface AppointmentActionsProps {
  appointment: Appointment
  role?: MembershipRole
  membershipId?: string
  compact?: boolean
  onUpdated?: (appointment: Appointment) => void
}

export function AppointmentActions({
  appointment,
  role,
  membershipId,
  compact,
  onUpdated,
}: AppointmentActionsProps) {
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['appointments-today'] })
  }

  const actorMembershipId = membershipId || appointment.employeeMembershipId || ''

  const confirmMutation = useMutation({
    mutationFn: () => appointmentsApi.confirm(appointment.id, actorMembershipId),
    onSuccess: (apt) => {
      toast.success('Agendamento confirmado')
      invalidate()
      onUpdated?.(apt)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao confirmar'),
  })

  const completeMutation = useMutation({
    mutationFn: () => appointmentsApi.complete(appointment.id, actorMembershipId),
    onSuccess: (apt) => {
      toast.success('Agendamento concluído')
      invalidate()
      onUpdated?.(apt)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao concluir'),
  })

  const noShowMutation = useMutation({
    mutationFn: () => appointmentsApi.noShow(appointment.id, actorMembershipId),
    onSuccess: (apt) => {
      toast.success('Marcado como não compareceu')
      invalidate()
      onUpdated?.(apt)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao registrar'),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!cancelReason.trim()) {
        toast.error('Informe o motivo do cancelamento')
        return
      }
      const apt = await appointmentsApi.cancel(appointment.id, cancelReason.trim(), actorMembershipId)
      return apt
    },
    onSuccess: (apt) => {
      toast.success('Agendamento cancelado')
      setCancelling(false)
      setCancelReason('')
      invalidate()
      onUpdated?.(apt)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Erro ao cancelar'),
  })

  const isOwnerOrManager = role === 'OWNER' || role === 'MANAGER'
  const isOwn = !!appointment.employeeMembershipId && appointment.employeeMembershipId === membershipId
  const canConfirm = isOwnerOrManager || (role === 'EMPLOYEE' && isOwn)
  const canAdminister = isOwnerOrManager

  const status = appointment.status
  const showConfirm = status === 'PENDING' && canConfirm
  const showComplete = status === 'CONFIRMED' && canConfirm
  const showNoShow = status === 'CONFIRMED' && canAdminister
  const showCancel = (status === 'PENDING' || status === 'CONFIRMED') && canAdminister
  const hasAny = showConfirm || showComplete || showNoShow || showCancel

  if (!hasAny) return null

  const buttonClass = compact
    ? 'px-2 py-1 text-[11px]'
    : 'flex-1 justify-center'

  return (
    <div className="space-y-2">
      <div className={cn('flex flex-wrap gap-2', compact ? 'justify-end' : '')}>
        {showConfirm && (
          <Button
            size="sm"
            onClick={() => confirmMutation.mutate()}
            loading={confirmMutation.isPending}
            className={buttonClass}
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar
          </Button>
        )}
        {showComplete && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => completeMutation.mutate()}
            loading={completeMutation.isPending}
            className={buttonClass}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Concluir
          </Button>
        )}
        {showNoShow && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => noShowMutation.mutate()}
            loading={noShowMutation.isPending}
            className={buttonClass}
          >
            <UserMinus className="h-3.5 w-3.5" />
            Não compareceu
          </Button>
        )}
        {(showCancel) && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelling((v) => !v)}
            className={buttonClass}
          >
            <Ban className="h-3.5 w-3.5" />
            Cancelar
          </Button>
        )}
      </div>

      {cancelling && (
        <div className="rounded-lg border border-border bg-muted p-3 space-y-2">
          <label className="label">Motivo do cancelamento *</label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            placeholder="Ex.: cliente desistiu, falta de profissional..."
            className="block w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCancelling(false)
                setCancelReason('')
              }}
              className="flex-1"
            >
              <X className="h-3.5 w-3.5" />
              Voltar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
              className="flex-1"
            >
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}