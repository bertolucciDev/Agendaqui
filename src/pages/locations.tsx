import { Link } from 'react-router-dom'
import { Plus, ArrowRight, MapPin, MoreVertical, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/services/api/locations'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/use-confirm'
import { notify } from '@/lib/notify'
import { useEffect, useRef, useState } from 'react'

const ATTENDANCE_LABEL: Record<string, string> = {
  AT_LOCATION: 'Atendimento no local',
  AT_CUSTOMER: 'Atendimento no cliente',
  BOTH: 'Atendimento nos dois',
}

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { confirm, confirmDialog } = useConfirm()

  const { businessId, activeMode } = useActiveBusiness()

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', activeMode, businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled: !!businessId,
  })

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(null)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [menuOpen])

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations'] })
      notify.success('Local removido')
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => deleteMutation.mutate() }),
  })

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remover local?',
      description: `“${name}” será removido. Os agendamentos já criados nesse local continuam na agenda, mas o local deixa de aceitar novos horários.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    })
    if (!ok) return
    deleteMutation.mutate(id)
  }

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
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
                <div key={loc.id} className="card-hover relative p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <MapPin className="h-5 w-5 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {ATTENDANCE_LABEL[loc.attendanceType ?? ''] ?? 'Atendimento'}
                        </p>
                      </div>
                    </div>
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === loc.id ? null : loc.id)}
                        className="btn-ghost !p-1"
                        aria-label={`Ações do local ${loc.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen === loc.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === loc.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-surface-overlay shadow-lg"
                        >
                          <button
                            role="menuitem"
                            onClick={() => {
                              void handleDelete(loc.id, loc.name)
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
                  <p className="mt-3 text-xs text-muted-foreground truncate">{loc.address}</p>
                  {loc.phone && (
                    <p className="mt-1 text-xs text-muted-foreground">{loc.phone}</p>
                  )}
                  {loc.isHeadquarter && (
                    <div className="mt-3">
                      <Badge variant="info">Sede</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContent>

      {confirmDialog}
    </>
  )
}
