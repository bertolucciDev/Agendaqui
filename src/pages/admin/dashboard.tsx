import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api/admin'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  href?: string
  color: 'primary' | 'success' | 'danger' | 'warning' | 'info'
}

function StatCard({ title, value, icon, href, color }: StatCardProps) {
  const colors = {
    primary: 'bg-primary-soft text-primary-soft-fg border-primary-accent',
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  }

  const content = (
    <div className={cn('rounded-xl border p-5', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        <div className="rounded-lg bg-white/40 p-2.5 dark:bg-black/20">
          {icon}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link to={href} className="block transition-transform hover:scale-[1.02]">
        {content}
      </Link>
    )
  }

  return content
}

function SkeletonCard() {
  return <Skeleton className="h-28 rounded-xl" />
}

export default function AdminDashboardPage() {
  const { data: verifications, isLoading } = useQuery({
    queryKey: ['admin', 'verifications', 'stats'],
    queryFn: () => adminApi.listVerifications({ limit: 100 }),
  })

  const items = verifications?.data ?? []

  const pending = items.filter((v) => v.status === 'PENDING').length
  const approved = items.filter((v) => v.status === 'APPROVED').length
  const rejected = items.filter((v) => v.status === 'REJECTED').length
  const draft = items.filter((v) => v.status === 'DRAFT').length
  const total = items.length

  return (
    <div>
      <PageHeader>
        <PageTitle>Dashboard Admin</PageTitle>
      </PageHeader>

      <PageContent>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Visão Geral</h2>
          <p className="text-sm text-muted-foreground">Acompanhe as solicitações de verificação de negócio.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Pendentes"
              value={pending}
              icon={<Clock className="h-6 w-6" />}
              href="/admin/verifications?status=PENDING"
              color="warning"
            />
            <StatCard
              title="Aprovados"
              value={approved}
              icon={<CheckCircle2 className="h-6 w-6" />}
              href="/admin/verifications?status=APPROVED"
              color="success"
            />
            <StatCard
              title="Rejeitados"
              value={rejected}
              icon={<XCircle className="h-6 w-6" />}
              href="/admin/verifications?status=REJECTED"
              color="danger"
            />
            <StatCard
              title="Em Rascunho"
              value={draft}
              icon={<ClipboardCheck className="h-6 w-6" />}
              href="/admin/verifications?status=DRAFT"
              color="info"
            />
            <StatCard
              title="Total"
              value={total}
              icon={<TrendingUp className="h-6 w-6" />}
              color="primary"
            />
          </div>
        )}

        {!isLoading && pending > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Ações pendentes</p>
                <p className="text-sm text-muted-foreground">
                  Você tem <strong>{pending}</strong> solicitação(ões) aguardando análise.
                </p>
              </div>
              <Link
                to="/admin/verifications?status=PENDING"
                className="btn btn-primary ml-auto"
              >
                Revisar
              </Link>
            </div>
          </div>
        )}
      </PageContent>
    </div>
  )
}
