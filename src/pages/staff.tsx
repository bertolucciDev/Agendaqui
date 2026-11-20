import { Link } from 'react-router-dom'
import { Plus, ArrowRight, MoreVertical, Trash2, Settings2, Power } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffApi } from '@/services/api/staff'
import { useAuth } from '@/app/providers/auth'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { useSession } from '@/app/providers/session'
import { StaffMemberModal } from '@/components/staff/staff-member-modal'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/use-confirm'
import { notify } from '@/lib/notify'
import type { Membership } from '@/types'

export default function StaffPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { session } = useSession()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const openMenuRef = useRef<HTMLDivElement>(null)

  const { businessId, business, activeMode } = useActiveBusiness()

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', activeMode, businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled: !!businessId,
  })

  /**
   * Vínculos do usuário logado neste negócio vêm da sessão (`GET /me/session`).
   * Isso evita depender da lista de funcionários — que pode não incluir o
   * usuário quando o vínculo está em outro local do mesmo negócio.
   */
  const ownMemberships =
    session?.businesses.find((b) => b.id === businessId)?.memberships ?? []
  const isBusinessOwner = ownMemberships.some((m) => m.role === 'OWNER')

  const invalidateStaff = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff'] })
    void queryClient.invalidateQueries({ queryKey: ['business-employees'] })
  }

  const deleteMutation = useMutation({
    mutationFn: staffApi.removeEmployee,
    onSuccess: () => {
      invalidateStaff()
      notify.success('Funcionário removido')
    },
    onError: (err: unknown) => notify.error(err),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      staffApi.updateEmployee(id, { active }),
    onSuccess: () => {
      invalidateStaff()
      notify.success('Status atualizado')
    },
    onError: (err: unknown) => notify.error(err),
  })

  const { confirm, confirmDialog } = useConfirm()

  const handleRemove = async (member: Membership) => {
    const confirmed = await confirm({
      title: 'Remover membro da equipe?',
      description: `${member.user?.name || 'Este membro'} perderá o acesso ao negócio e os agendamentos vinculados. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    })
    if (!confirmed) return
    deleteMutation.mutate(member.id)
  }

  /* Fecha o menu de ações ao clicar fora ou apertar Esc. */
  useEffect(() => {
    if (!menuOpen) return

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (gridRef.current && !gridRef.current.contains(target)) {
        setMenuOpen(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  /* Move o foco para o primeiro item do menu quando ele abre. */
  useEffect(() => {
    if (!menuOpen) return
    const firstItem = openMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
    firstItem?.focus()
  }, [menuOpen])

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" ref={gridRef}>
                {staff.map((member) => {
                  const isSelf = member.userId === user?.id
                  const isOwnerMember = member.role === 'OWNER'
                  return (
                    <div key={member.id} className="card-hover p-5 relative">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-sm font-bold text-warning-soft-fg">
                            {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <h2 className="text-sm font-semibold text-foreground">{member.user?.name || 'Sem nome'}</h2>
                            <p className="text-xs text-muted-foreground">{member.position || roleLabels[member.role] || member.role}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                            className="btn-ghost !p-1"
                            aria-label="Ações do membro"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen === member.id}
                            onKeyDown={(event) => {
                              if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setMenuOpen(member.id)
                              }
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpen === member.id && (
                            <div
                              ref={openMenuRef}
                              role="menu"
                              aria-label="Ações do membro"
                              className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-border bg-surface-overlay shadow-lg"
                            >
                              <button
                                role="menuitem"
                                onClick={() => {
                                  toggleActiveMutation.mutate({ id: member.id, active: !member.active })
                                  setMenuOpen(null)
                                }}
                                disabled={isSelf}
                                className="flex w-full items-center gap-2 rounded-t-lg px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-40"
                              >
                                <Power className="h-3.5 w-3.5" />
                                {member.active ? 'Desativar' : 'Ativar'}
                              </button>
                              <button
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpen(null)
                                  void handleRemove(member)
                                }}
                                disabled={isSelf || isOwnerMember}
                                title={
                                  isOwnerMember
                                    ? 'O vínculo de proprietário não pode ser removido.'
                                    : undefined
                                }
                                className="flex w-full items-center gap-2 rounded-b-lg px-3 py-2 text-sm text-destructive-soft-fg hover:bg-destructive-soft disabled:opacity-40"
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
                  )
                })}
              </div>
              {!isBusinessOwner && staff.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Apenas o proprietário do negócio pode alterar o nível de acesso da equipe.
                </p>
              )}
            </>
          )}
        </div>
      </PageContent>

      {selectedMember && businessId && (
        <StaffMemberModal
          member={selectedMember}
          businessId={businessId}
          businessName={business?.name}
          currentUserId={user?.id}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {confirmDialog}
    </>
  )
}
