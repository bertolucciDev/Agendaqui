import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '@/services/api/notifications'
import { Button } from '@/components/ui/button'

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: () => notificationsApi.list(20),
    refetchInterval: 60_000,
  })
  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'me'] }),
  })

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0

  const openNotification = async (
    id: string,
    appointmentId: string,
    startsAt: string,
    readAt: string | null,
  ) => {
    setOpen(false)
    if (!readAt) {
      try {
        await markReadMutation.mutateAsync(id)
      } catch {
        // A falha ao marcar como lida não deve impedir a navegação ao agendamento.
      }
    }
    navigate(`/my-notifications?notificationId=${encodeURIComponent(id)}&appointmentId=${encodeURIComponent(appointmentId)}&startsAt=${encodeURIComponent(startsAt)}`)
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : 'Notificações'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative h-9 w-9"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <section
          aria-label="Notificações"
          className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}` : 'Tudo em dia'}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificationsQuery.isPending ? (
              <p role="status" className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando notificações…</p>
            ) : null}
            {notificationsQuery.isError ? (
              <p role="alert" className="px-4 py-6 text-center text-sm text-destructive">Não foi possível carregar as notificações.</p>
            ) : null}
            {notificationsQuery.data?.items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">Você ainda não tem notificações.</p>
              </div>
            ) : null}
            {notificationsQuery.data?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openNotification(
                  item.id,
                  item.appointmentId,
                  item.appointment.startsAt,
                  item.readAt,
                )}
                className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                    {!item.readAt ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Não lida" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.body}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{formatCreatedAt(item.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
