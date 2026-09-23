import { Link } from 'react-router-dom'
import { Plus, ArrowRight, MoreVertical, Trash2, Settings2, Power } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffApi } from '@/services/api/staff'
import { useAuth } from '@/app/providers/auth'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { StaffMemberModal } from '@/components/staff/staff-member-modal'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Membership } from '@/types'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function StaffPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null)

  const { businessId } = useActiveBusiness()

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId,
  })

  const invalidateStaff = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff'] })
    void queryClient.invalidateQueries({ queryKey: ['business-employees'] })
  }

  const deleteMutation = useMutation({
    mutationFn: staffApi.removeEmployee,
    onSuccess: () => {
      invalidateStaff()
      toast.success('Funcionário removido')
    },
    onError: () => toast.error('Erro ao remover funcionário'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      staffApi.updateEmployee(id, { active }),
    onSuccess: () => {
      invalidateStaff()
      toast.success('Status atualizado')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const roleLabels: Record<string, string> = {
    OWNER: 'Proprietário',
    MANAGER: 'Gerente',
    EMPLOYEE: 'Funcionário',
  }

  return (
    <>
      <PageHeader>
        <PageTitle>Equipe</PageTitle>
        <Link to="/staff/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          {isLoading ? (
            <div className="flex py-16 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              title="Nenhum funcionário"
              description="Adicione funcionários aos seus locais para atribuir agendamentos."
              action={
                <Link to="/staff/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Adicionar funcionário
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((member) => (
                  <div key={member.id} className="card-hover p-5 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50 text-sm font-bold text-amber-600">
                          {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{member.user?.name || 'Sem nome'}</h3>
                          <p className="text-xs text-ink-muted">{member.position || roleLabels[member.role] || member.role}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                          className="btn-ghost !p-1"
                          aria-label="Ações do membro"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuOpen === member.id && (
                          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-warm-200 bg-white shadow-lg">
                            <button
                              onClick={() => {
                                toggleActiveMutation.mutate({ id: member.id, active: !member.active })
                                setMenuOpen(null)
                              }}
                              disabled={member.userId === user?.id}
                              className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm text-foreground hover:bg-warm-50 disabled:opacity-40"
                            >
                              <Power className="h-3.5 w-3.5" />
                              {member.active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => {
                                deleteMutation.mutate(member.id)
                                setMenuOpen(null)
                              }}
                              disabled={member.userId === user?.id}
                              className="flex w-full items-center gap-2 rounded-b-lg px-3 py-2 text-sm text-destructive hover:bg-destructive-50 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant={member.active ? 'success' : 'neutral'}>
                        {member.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMember(member)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Gerenciar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </PageContent>

      {selectedMember && businessId && (
        <StaffMemberModal
          member={selectedMember}
          businessId={businessId}
          currentUserId={user?.id}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  )
}