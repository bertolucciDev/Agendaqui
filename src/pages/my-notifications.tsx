import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarDays } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { notificationsApi } from '@/services/api/notifications'
import { notify } from '@/lib/notify'
import { extractApiMessage } from '@/lib/api-error'
import { PageContent, PageHeader, PageTitle } from '@/components/ui/page'

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(date)
}

export default function MyNotificationsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const selectedId = searchParams.get('notificationId')
  const preferenceQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsApi.getPreference,
  })
  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => notificationsApi.list(50),
    refetchInterval: 60_000,
  })
  const preferenceMutation = useMutation({
    mutationFn: notificationsApi.updatePreference,
    onSuccess: (preference) => {
      queryClient.setQueryData(['notifications', 'preferences'], preference)
      notify.success(preference.emailAppointmentRemindersEnabled
        ? 'Lembretes por e-mail ativados.'
        : 'Lembretes por e-mail desativados.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível salvar a preferência.'),
  })
  const readMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] }),
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível marcar a notificação como lida.'),
  })

  return (
    <>
      <PageHeader>
        <PageTitle>Minhas notificações</PageTitle>
      </PageHeader>
      <PageContent>
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Lembretes de agendamento</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Receba um e-mail 24 horas antes dos agendamentos confirmados. Você pode mudar essa opção quando quiser.
            </p>
            <label className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <span className="text-sm font-medium text-foreground">Lembretes por e-mail</span>
              <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  aria-label="Lembretes por e-mail"
                  checked={preferenceQuery.data?.emailAppointmentRemindersEnabled ?? false}
                  disabled={preferenceQuery.isPending || preferenceQuery.isError || preferenceMutation.isPending}
                  onChange={(event) => preferenceMutation.mutate(event.target.checked)}
                />
                <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary peer-disabled:opacity-50" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            {preferenceQuery.isError ? (
              <p role="alert" className="mt-3 text-xs text-destructive">Não foi possível carregar essa preferência.</p>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Avisos da sua conta</h2>
              </div>
            </div>
            {notificationsQuery.isPending ? (
              <p role="status" className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando notificações…</p>
            ) : null}
            {notificationsQuery.isError ? (
              <p role="alert" className="px-5 py-8 text-center text-sm text-destructive">Não foi possível carregar as notificações.</p>
            ) : null}
            {notificationsQuery.data?.items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">Seus lembretes aparecerão aqui.</p>
              </div>
            ) : null}
            <ul>
              {notificationsQuery.data?.items.map((item) => (
                <li
                  key={item.id}
                  className={`border-b border-border px-5 py-4 last:border-b-0 ${item.id === selectedId ? 'bg-primary-soft/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatCreatedAt(item.createdAt)}</p>
                    </div>
                    {!item.readAt ? (
                      <button
                        type="button"
                        disabled={readMutation.isPending}
                        onClick={() => readMutation.mutate(item.id)}
                        className="shrink-0 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Marcar como lida
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">Lida</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </PageContent>
    </>
  )
}
