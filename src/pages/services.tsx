import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Scissors, MoreVertical, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicesApi } from '@/services/api/services'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { businessId, activeMode } = useActiveBusiness()

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', activeMode, businessId],
    queryFn: () => servicesApi.list(businessId!),
    enabled: !!businessId,
  })

  const deleteMutation = useMutation({
    mutationFn: servicesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Serviço removido')
    },
    onError: () => toast.error('Erro ao remover serviço'),
  })

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
  }

  return (
    <>
      <PageHeader>
        <PageTitle>Serviços</PageTitle>
        <Link to="/services/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          {isLoading ? (
            <div className="flex py-16 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : services.length === 0 ? (
            <EmptyState
              title="Nenhum serviço cadastrado"
              description="Defina os serviços, preços e durações para seus clientes agendarem."
              action={
                <Link to="/services/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Criar serviço
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <div key={svc.id} className="card-hover p-5 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <Scissors className="h-5 w-5 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{svc.name}</h3>
                        <p className="text-xs text-muted-foreground">{svc.durationMinutes}min</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === svc.id ? null : svc.id)}
                        className="btn-ghost !p-1"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === svc.id && (
                        <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-surface-overlay shadow-lg">
                          <button
                            onClick={() => {
                              deleteMutation.mutate(svc.id)
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
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-primary-600">{formatPrice(svc.priceCents)}</p>
                    <Badge variant={svc.active ? 'success' : 'neutral'}>
                      {svc.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContent>
    </>
  )
}
