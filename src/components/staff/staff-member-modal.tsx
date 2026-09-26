import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save, UserCog, Clock, Scissors, Check } from 'lucide-react'
import { staffApi } from '@/services/api/staff'
import { servicesApi } from '@/services/api/services'
import type {
  DayOfWeek,
  Membership,
  MembershipRole,
  WorkingHoursEntry,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const DAY_LABELS: Record<DayOfWeek, string> = {
  SUNDAY: 'Domingo',
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
}

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const HOUR_OPTIONS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => ({
  value: String(h * 60),
  label: `${String(h).padStart(2, '0')}:00`,
}))

const DEFAULT_OPEN: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

interface DayEntry {
  dayOfWeek: DayOfWeek
  open: boolean
  startMinute: number
  endMinute: number
}

interface StaffMemberModalProps {
  member: Membership
  businessId: string
  currentUserId?: string
  onClose: () => void
}

type Tab = 'edit' | 'hours' | 'services'

function toEntries(member: Membership): DayEntry[] {
  const existing = member.workingHours?.length
    ? member.workingHours
    : undefined
  return DAY_ORDER.map((day) => {
    const w = existing?.find((e) => e.dayOfWeek === day)
    if (w) {
      return {
        dayOfWeek: day,
        open: w.endMinute > w.startMinute,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
      }
    }
    return {
      dayOfWeek: day,
      open: DEFAULT_OPEN.includes(day),
      startMinute: 540,
      endMinute: 1080,
    }
  })
}

export function StaffMemberModal({
  member,
  businessId,
  currentUserId,
  onClose,
}: StaffMemberModalProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('edit')
  const [position, setPosition] = useState(member.position || '')
  const [role, setRole] = useState<MembershipRole>(member.role)
  const [active, setActive] = useState(member.active)
  const [days, setDays] = useState<DayEntry[]>(() => toEntries(member))

  const isSelf = member.userId === currentUserId
  const isOwner = member.role === 'OWNER'

  const invalidateStaff = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff'] })
    void queryClient.invalidateQueries({ queryKey: ['business-employees'] })
  }

  const editMutation = useMutation({
    mutationFn: () =>
      staffApi.updateEmployee(member.id, { position, role, active }),
    onSuccess: () => {
      invalidateStaff()
      toast.success('Membro atualizado')
      onClose()
    },
    onError: () => toast.error('Erro ao atualizar membro'),
  })

  const hoursMutation = useMutation({
    mutationFn: () => {
      const entries: WorkingHoursEntry[] = days
        .filter((d) => d.open && d.endMinute > d.startMinute)
        .map((d) => ({ dayOfWeek: d.dayOfWeek, startMinute: d.startMinute, endMinute: d.endMinute }))
      return staffApi.setWorkingHours(member.id, entries)
    },
    onSuccess: () => {
      invalidateStaff()
      toast.success('Horários atualizados')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar horários'),
  })

  const { data: services = [] } = useQuery({
    queryKey: ['services', businessId],
    queryFn: () => servicesApi.list(businessId),
    enabled: tab === 'services',
  })

  const toggleServiceMutation = useMutation({
    mutationFn: ({ serviceId, assigned }: { serviceId: string; assigned: boolean }) => {
      return assigned
        ? staffApi.unassignProfessional(serviceId, member.id)
        : staffApi.assignProfessional(serviceId, member.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services', businessId] })
    },
    onError: () => toast.error('Erro ao atualizar vínculo'),
  })

  const setDay = (dayOfWeek: DayOfWeek, patch: Partial<DayEntry>) => {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'edit', label: 'Editar', icon: UserCog },
    { id: 'hours', label: 'Horários', icon: Clock },
    { id: 'services', label: 'Serviços', icon: Scissors },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 animate-in-scale">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground font-display">
              {member.user?.name || 'Sem nome'}
            </h3>
            <p className="text-xs text-muted-foreground">{member.position || member.role}</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-lg border border-border mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors',
                tab === t.id ? 'bg-primary-soft text-primary-soft-fg' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'edit' && (
          <div className="space-y-4">
            <div>
              <label className="label">Cargo / função</label>
              <Input
                className="mt-1.5"
                placeholder="Ex.: Barbeiro, Recepcionista..."
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Papel</label>
              <Select
                className="mt-1.5"
                value={role}
                disabled={isOwner}
                options={[
                  { value: 'MANAGER', label: 'Gerente' },
                  { value: 'EMPLOYEE', label: 'Funcionário' },
                  { value: 'OWNER', label: 'Proprietário' },
                ]}
                onChange={(e) => setRole(e.target.value as MembershipRole)}
              />
              {isOwner && <p className="mt-1 text-xs text-muted-foreground">O papel de proprietário não pode ser alterado.</p>}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Membro ativo</p>
                <p className="text-xs text-muted-foreground">
                  {isSelf ? 'Você não pode desativar a si mesmo.' : 'Inativos não recebem agendamentos.'}
                </p>
              </div>
              <button
                onClick={() => !isSelf && setActive((v) => !v)}
                disabled={isSelf}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  active ? 'bg-success' : 'bg-border',
                  isSelf && 'opacity-40 cursor-not-allowed'
                )}
                aria-label="Alternar ativo"
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                    active ? 'left-[22px]' : 'left-0.5'
                  )}
                />
              </button>
            </div>

            <Button
              onClick={() => editMutation.mutate()}
              loading={editMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4" />
              Salvar alterações
            </Button>
          </div>
        )}

        {tab === 'hours' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Defina os horários de atendimento por dia da semana.
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {days.map((d) => (
                <div key={d.dayOfWeek} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <button
                    onClick={() => setDay(d.dayOfWeek, { open: !d.open })}
                    className={cn(
                      'h-6 w-11 relative rounded-full transition-colors shrink-0',
                      d.open ? 'bg-success' : 'bg-border'
                    )}
                    aria-label="Atende neste dia"
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                        d.open ? 'left-[22px]' : 'left-0.5'
                      )}
                    />
                  </button>
                  <span className={cn('w-16 text-xs font-medium', d.open ? 'text-foreground' : 'text-muted-foreground line-through')}>
                    {DAY_LABELS[d.dayOfWeek]}
                  </span>
                  <div className="flex flex-1 items-center gap-1">
                    <select
                      value={String(d.startMinute)}
                      disabled={!d.open}
                      onChange={(e) => setDay(d.dayOfWeek, { startMinute: Number(e.target.value) })}
                      className="flex-1 rounded-lg border border-border bg-input-bg px-1.5 py-1 text-xs text-foreground disabled:opacity-40"
                    >
                      {HOUR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="text-xs text-muted-foreground">às</span>
                    <select
                      value={String(d.endMinute)}
                      disabled={!d.open}
                      onChange={(e) => setDay(d.dayOfWeek, { endMinute: Number(e.target.value) })}
                      className="flex-1 rounded-lg border border-border bg-input-bg px-1.5 py-1 text-xs text-foreground disabled:opacity-40"
                    >
                      {HOUR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => hoursMutation.mutate()}
              loading={hoursMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4" />
              Salvar horários
            </Button>
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Serviços que este profissional pode executar. Apenas os selecionados geram horários no agendamento.
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {services.map((svc) => {
                const assigned = svc.membershipIds?.includes(member.id) ?? false
                const pending = toggleServiceMutation.isPending
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleServiceMutation.mutate({ serviceId: svc.id, assigned })}
                    disabled={pending}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                      assigned ? 'border-primary-200 bg-primary-soft' : 'border-border hover:border-primary-200',
                      pending && 'opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                        assigned ? 'border-primary-500 bg-primary-500 text-white' : 'border-border bg-surface'
                      )}
                    >
                      {assigned && <Check className="h-3 w-3" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{svc.name}</p>
                      <p className="text-xs text-muted-foreground">{svc.durationMinutes}min</p>
                    </div>
                  </button>
                )
              })}
              {services.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}