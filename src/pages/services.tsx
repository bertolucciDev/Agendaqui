import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Scissors, MoreVertical, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicesApi } from '@/services/api/services'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/use-confirm'
import { notify } from '@/lib/notify'
import { useEffect, useRef, useState } from 'react'

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { confirm, confirmDialog } = useConfirm()

  const { businessId, activeMode } = useActiveBusiness()

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', activeMode, businessId],
    queryFn: () => servicesApi.list(businessId!),
    enabled: !!businessId,
  })

  /* Fecha o menu de ações com Escape ou clique fora — sem isso o menu
   * ficava flutuando sobre a tela depois de navegar. */
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
    mutationFn: servicesApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      notify.success('Serviço removido')
    },
    onError: (err: unknown) =>
      notify.error(err, { retry: () => deleteMutation.mutate() }),
  })

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Remover serviço?',
      description: `“${name}” será removido do catálogo. Os agendamentos já criados continuam na agenda.`,
      confirmLabel: 'Remover',
      variant: 'destructive',
    })
    if (!ok) return
    deleteMutation.mutate(id)
  }

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
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
                <div key={svc.id} className="card-hover relative p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <Scissors className="h-5 w-5 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground truncate">{svc.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {svc.durationMinutes}min
                          {svc.bufferMinutes ? ` + ${svc.bufferMinutes}min intervalo` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === svc.id ? null : svc.id)}
                        className="btn-ghost !p-1"
                        aria-label={`Ações do serviço ${svc.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen === svc.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === svc.id && (
                        <div
                          role="menu"
                          className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-border bg-surface-overlay shadow-lg"
                        >
                          <button
                            role="menuitem"
                            onClick={() => {
                              void handleDelete(svc.id, svc.name)
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
                    <p className="text-lg font-bold text-primary-accent">{formatPrice(svc.priceCents)}</p>
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

      {confirmDialog}
    </>
  )
}
