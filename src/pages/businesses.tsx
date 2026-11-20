import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Building2, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { businessesApi } from '@/services/api/businesses'
import { useSession } from '@/app/providers/session'
import { useWorkspace } from '@/app/providers/workspace'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/use-confirm'
import { notify } from '@/lib/notify'
import { usePendingBusinessVerification } from '@/hooks/use-business-verification'

const ROLE_LABELS: Record<string, string> = { OWNER: 'Proprietário', MANAGER: 'Gerente', EMPLOYEE: 'Profissional' }

export default function BusinessesPage() {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()
  // Fonte: contrato /me/session (sem store local, sem businesses[0])
  const { session, isSessionLoading, refreshSession } = useSession()
  const { activeBusiness, switchBusiness } = useWorkspace()
  const businesses = session?.businesses ?? []
  const activeId = activeBusiness?.id
  const pendingVerification = usePendingBusinessVerification()

  const deleteMutation = useMutation({
    mutationFn: businessesApi.delete,
    onSuccess: () => {
      refreshSession()
      notify.success('Negócio removido')
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => deleteMutation.mutate(deleteTarget) }),
  })

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remover negócio?',
      description: `“${name}” e todos os locais, serviços e agendamentos dele serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    })
    if (!ok) return
    setDeleteTarget(id)
    deleteMutation.mutate(id)
  }

  return (
    <>
      <PageHeader>
        <PageTitle>Negócios</PageTitle>
        <Link to="/businesses/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo negócio
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          {isSessionLoading ? (
            <div className="flex py-16 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : businesses.length === 0 && !pendingVerification ? (
            <EmptyState
              title="Nenhum negócio cadastrado"
              description="Cadastre seu primeiro negócio para começar a receber agendamentos."
              action={
                <Link to="/businesses/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Criar primeiro negócio
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((biz) => (
                <div key={biz.id} className="card-hover p-5 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                        <Building2 className="h-5 w-5 text-primary-500" />
                      </div>
                      <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{biz.name}</h3>
                        {biz.id === activeId && (
                          <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-fg">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        )}
                      </div>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[biz.memberships[0]?.role] || biz.memberships[0]?.role || 'Membro'}
                        </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === biz.id ? null : biz.id)}
                      className="btn-ghost !p-1"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === biz.id && (
                      <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-surface-overlay shadow-lg">
                        {biz.id !== activeId && (
                            <button
                              onClick={() => {
                                switchBusiness(biz.id)
                                notify.success('Negócio ativo alterado')
                                setMenuOpen(null)
                              }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary-soft"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Tornar ativo
                          </button>
                        )}
                        <button
                          onClick={() => {
                            void handleDelete(biz.id, biz.name)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive-soft-fg hover:bg-destructive-soft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground truncate">
                    {(() => {
                      const roles = biz.memberships.map((m) => ROLE_LABELS[m.role] || m.role)
                      const unique = [...new Set(roles)]
                      const shown = unique.slice(0, 3)
                      return shown.join(' · ') + (unique.length > 3 ? ` +${unique.length - 3}` : '')
                    })()}
                  </p>
                </div>
              ))}
              {pendingVerification ? (
                <div
                  key={`pending-${pendingVerification.verificationId}`}
                  aria-label={`${pendingVerification.tradeName ?? 'Novo negócio'}, pendente de aprovação`}
                  className="card-hover p-5 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {pendingVerification.tradeName ?? 'Novo negócio'}
                        </h3>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Pendente
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Enviado para análise</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </PageContent>

      {confirmDialog}
    </>
  )
}
