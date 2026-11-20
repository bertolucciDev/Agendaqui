import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api/admin'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Wrench,
  User,
  Building2,
  SlidersHorizontal,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  ACTIVE: { label: 'Ativo', variant: 'success' },
  BLOCKED: { label: 'Bloqueado', variant: 'destructive' },
}

function BadgeStatus({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'secondary' }
  const variantStyles: Record<string, string> = {
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    destructive: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    secondary: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', variantStyles[config.variant] ?? variantStyles.secondary)}>
      {config.label}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-md bg-primary-soft p-1.5 text-primary-soft-fg">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export default function AdminBusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: business, isLoading } = useQuery({
    queryKey: ['admin', 'business-detail', id],
    queryFn: () => adminApi.getBusinessDetail(id!),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-48" />
          </div>
        </PageHeader>
        <PageContent>
          <div className="grid gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </PageContent>
      </div>
    )
  }

  if (!business) {
    return (
      <div>
        <PageHeader>
          <PageTitle>Negocio nao encontrado</PageTitle>
        </PageHeader>
        <PageContent>
          <Link to="/admin/businesses" className="btn btn-ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para lista
          </Link>
        </PageContent>
      </div>
    )
  }

  return (
    <div>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/businesses" className="btn btn-ghost !p-2">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <PageTitle>{business.name}</PageTitle>
              <p className="text-sm text-muted-foreground">{business.document}</p>
            </div>
          </div>
          <BadgeStatus status={business.status} />
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Owner info */}
          <Section title="Proprietario" icon={<User className="h-4 w-4" />}>
            <InfoRow label="Nome" value={business.ownerName} />
            <InfoRow label="Email" value={business.ownerEmail} />
            {business.responsibleName && (
              <InfoRow label="Responsavel Legal" value={business.responsibleName} />
            )}
            {business.responsibleCpf && (
              <InfoRow label="CPF Responsavel" value={business.responsibleCpf} />
            )}
          </Section>

          {/* Business info */}
          <Section title="Dados do Negocio" icon={<Building2 className="h-4 w-4" />}>
            <InfoRow label="Nome Fantasia" value={business.name} />
            <InfoRow label="Razao Social" value={business.legalName} />
            <InfoRow label="CNPJ/CPF" value={business.document} />
            <InfoRow label="Tipo" value={business.type === 'COMPANY' ? 'Pessoa Juridica' : 'Pessoa Fisica'} />
            <InfoRow label="Categoria" value={business.categoryName} />
            <InfoRow label="Status" value={business.status} />
            {business.phone && <InfoRow label="Telefone" value={business.phone} />}
            {business.description && <InfoRow label="Descricao" value={business.description} />}
          </Section>

          {/* Settings */}
          <Section title="Configuracoes" icon={<SlidersHorizontal className="h-4 w-4" />}>
            <InfoRow label="Politica de Cancelamento" value={`${business.cancellationPolicyHours}h`} />
            <InfoRow label="Janela de Agendamento" value={`${business.bookingWindowDays} dias`} />
            <InfoRow label="Granularidade" value={`${business.slotGranularityMinutes} min`} />
            <InfoRow label="Vende Produtos" value={business.sellsProducts ? 'Sim' : 'Nao'} />
            <InfoRow label="Slug" value={business.slug} />
            <InfoRow label="Criado em" value={formatDate(business.createdAt)} />
            <InfoRow label="Atualizado em" value={formatDate(business.updatedAt)} />
          </Section>

          {/* Locations */}
          <Section title={`Locais (${business.locations.length})`} icon={<MapPin className="h-4 w-4" />}>
            {business.locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum local cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {business.locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{loc.name}</p>
                      <p className="text-xs text-muted-foreground">{loc.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {loc.isHeadquarter && (
                        <Badge variant="neutral" className="text-[10px]">Matriz</Badge>
                      )}
                      <Badge variant={loc.status === 'ACTIVE' ? 'success' : 'neutral'} className="text-[10px]">
                        {loc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Services */}
          <Section title={`Servicos (${business.services.length})`} icon={<Wrench className="h-4 w-4" />}>
            {business.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum servico cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {business.services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{svc.name}</p>
                      {svc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{svc.description}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground ml-3 shrink-0">
                      <p>{(svc.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p>{svc.durationMinutes}min</p>
                    </div>
                    <Badge variant={svc.active ? 'success' : 'neutral'} className="text-[10px] ml-2">
                      {svc.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </PageContent>
    </div>
  )
}
