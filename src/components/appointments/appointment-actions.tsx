import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck, X, Ban, UserMinus } from 'lucide-react'
import { appointmentsApi } from '@/services/api/appointments'
import type { Appointment, MembershipRole } from '@/types'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

interface AppointmentActionsProps {
  appointment: Appointment
  role?: MembershipRole
  membershipId?: string
  compact?: boolean
  /** Chamado depois de uma mutação bem-sucedida (o backend devolve 204). */
  onUpdated?: () => void
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
    void queryClient.invalidateQueries({ queryKey: ['professional-agenda'] })
  }

  /**
   * O backend exige um `employeeMembershipId` VÁLIDO (UUID) e confere que ele
   * é o profissional do agendamento. Mandar string vazia é 400. O
   * agendamento sempre tem um profissional atribuído — é esse id que deve
   * ser enviado, mesmo quando quem age é o dono ou o gerente.
   */
  const targetMembershipId = appointment.employeeMembershipId ?? ''
  const hasTarget = targetMembershipId.length > 0

  const confirmMutation = useMutation({
    mutationFn: () => appointmentsApi.confirm(appointment.id, targetMembershipId),
    onSuccess: () => {
      notify.success('Agendamento confirmado')
      invalidate()
      onUpdated?.()
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => confirmMutation.mutate() }),
  })

  const completeMutation = useMutation({
    mutationFn: () => appointmentsApi.complete(appointment.id, targetMembershipId),
    onSuccess: () => {
      notify.success('Agendamento concluído')
      invalidate()
      onUpdated?.()
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => completeMutation.mutate() }),
  })

  const noShowMutation = useMutation({
    mutationFn: () => appointmentsApi.noShow(appointment.id, targetMembershipId),
    onSuccess: () => {
      notify.success('Marcado como não compareceu')
      invalidate()
      onUpdated?.()
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => noShowMutation.mutate() }),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason = cancelReason.trim()
      if (!reason) {
        notify.warning('Informe o motivo do cancelamento')
        throw new Error('motivo obrigatório')
      }
      await appointmentsApi.cancel(appointment.id, reason, targetMembershipId || undefined)
    },
    onSuccess: () => {
      notify.success('Agendamento cancelado')
      setCancelling(false)
      setCancelReason('')
      invalidate()
      onUpdated?.()
    },
    onError: (err: unknown) => {
      // A validação local do motivo já foi notify.warning acima.
      if (err instanceof Error && err.message === 'motivo obrigatório') return
      notify.error(err, { retry: () => cancelMutation.mutate() })
    },
  })

  const isOwnerOrManager = role === 'OWNER' || role === 'MANAGER'
  const isOwn = !!appointment.employeeMembershipId && appointment.employeeMembershipId === membershipId
  const canConfirm = hasTarget && (isOwnerOrManager || (role === 'EMPLOYEE' && isOwn))
  const canAdminister = hasTarget && isOwnerOrManager

  const status = appointment.status
  const showConfirm = status === 'PENDING' && canConfirm
  const showComplete = status === 'CONFIRMED' && canConfirm
  const showNoShow = status === 'CONFIRMED' && canAdminister
  const showCancel = (status === 'PENDING' || status === 'CONFIRMED') && canAdminister
  const hasAny = showConfirm || showComplete || showNoShow || showCancel

  if (!hasAny) return null

  const buttonClass = compact ? 'px-2 py-1 text-[11px]' : 'flex-1 justify-center'

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
        {showCancel && (
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
          <label className="label" htmlFor={`cancel-reason-${appointment.id}`}>
            Motivo do cancelamento *
          </label>
          <p id={`cancel-reason-help-${appointment.id}`} className="text-xs text-muted-foreground">
            Seja breve e não inclua informações de saúde ou outros detalhes pessoais. O motivo fica no histórico do agendamento.
          </p>
          <textarea
            id={`cancel-reason-${appointment.id}`}
            aria-describedby={`cancel-reason-help-${appointment.id}`}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            maxLength={500}
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
