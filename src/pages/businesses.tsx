import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Building2, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessesApi } from '@/services/api/businesses'
import { setActiveBusinessId, getActiveBusinessId } from '@/lib/business-store'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function BusinessesPage() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessesApi.list,
  })

  const activeId = getActiveBusinessId()

  const deleteMutation = useMutation({
    mutationFn: businessesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Negócio removido')
    },
    onError: () => toast.error('Erro ao remover negócio'),
  })

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
          {isLoading ? (
            <div className="flex py-16 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : businesses.length === 0 ? (
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                        <Building2 className="h-5 w-5 text-primary-500" />
                      </div>
<div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-foreground">{biz.name}</h3>
                        {biz.id === activeId && (
                          <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted">{biz.type === 'COMPANY' ? 'Empresa' : 'Individual'}</p>
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
                      <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-warm-200 bg-white shadow-lg">
                        {biz.id !== activeId && (
                          <button
                            onClick={() => {
                              setActiveBusinessId(biz.id)
                              queryClient.invalidateQueries({ queryKey: ['businesses'] })
                              toast.success('Negócio ativo alterado')
                              setMenuOpen(null)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Tornar ativo
                          </button>
                        )}
                        <button
                          onClick={() => {
                            deleteMutation.mutate(biz.id)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                  </div>
                  {biz.description && (
                    <p className="mt-3 text-xs text-ink-muted line-clamp-2">{biz.description}</p>
                  )}
                  {biz.phone && (
                    <p className="mt-2 text-xs text-ink-faint">{biz.phone}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContent>
    </>
  )
}
