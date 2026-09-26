import { Link } from 'react-router-dom'
import { Plus, ArrowRight, MapPin, MoreVertical, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/services/api/locations'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const { businessId, activeMode } = useActiveBusiness()

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', activeMode, businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId,
  })

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Local removido')
    },
    onError: () => toast.error('Erro ao remover local'),
  })

  return (
    <>
      <PageHeader>
        <PageTitle>Locais</PageTitle>
        <Link to="/locations/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo local
          </Button>
        </Link>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          {isLoading ? (
            <div className="flex py-16 justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : locations.length === 0 ? (
            <EmptyState
              title="Nenhum local cadastrado"
              description="Adicione locais aos seus negócios para definir horários e feriados."
              action={
                <Link to="/locations/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Adicionar local
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <div key={loc.id} className="card-hover p-5 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <MapPin className="h-5 w-5 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground">{loc.attendanceType === 'AT_LOCATION' ? 'No local' : loc.attendanceType === 'AT_CUSTOMER' ? 'No cliente' : 'Ambos'}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === loc.id ? null : loc.id)}
                        className="btn-ghost !p-1"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === loc.id && (
                        <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-surface-overlay shadow-lg">
                          <button
                            onClick={() => {
                              deleteMutation.mutate(loc.id)
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
                  <p className="mt-3 text-xs text-muted-foreground">{loc.address}</p>
                  {loc.phone && (
                    <p className="mt-1 text-xs text-muted-foreground">{loc.phone}</p>
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
