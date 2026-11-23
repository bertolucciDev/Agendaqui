import { useState } from 'react'
import { useAuth } from '@/app/providers/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, usersApi } from '@/services/api'
import { notificationsApi } from '@/services/api/notifications'
import { notify } from '@/lib/notify'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations'
import { extractApiMessage, extractApiStatus, isWrongCurrentPassword } from '@/lib/api-error'
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/notification-preferences'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PrivacyRequestsPanel } from '@/components/settings/privacy-requests-panel'
import {
  User,
  Shield,
  LockKeyhole,
  LogOut,
  Key,
  Bell,
  Save,
} from 'lucide-react'

const NOTIFICATION_ITEMS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'appointments', label: 'Novos agendamentos', description: 'Receber aviso quando um cliente agendar' },
  { key: 'cancellations', label: 'Cancelamentos', description: 'Receber aviso quando um agendamento for cancelado' },
]

export default function SettingsPage({ supportMode = false }: { supportMode?: boolean }) {
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'privacy'>('profile')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '')
  const [emailChangeInput, setEmailChangeInput] = useState('')
  const [emailChangeTarget, setEmailChangeTarget] = useState('')
  const [emailChangeCode, setEmailChangeCode] = useState('')
  const pendingEmailChangeQuery = useQuery({
    queryKey: ['auth', 'email-change', 'pending'],
    queryFn: authApi.getPendingEmailChange,
  })
  const visibleEmailChangeTarget = emailChangeTarget || pendingEmailChangeQuery.data?.email || ''
  const [notifications, setNotifications] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences()
  )
  const reminderPreferenceQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: notificationsApi.getPreference,
    enabled: !supportMode,
  })
  const reminderPreferenceMutation = useMutation({
    mutationFn: notificationsApi.updatePreference,
    onSuccess: (preference) => {
      queryClient.setQueryData(['notifications', 'preferences'], preference)
      notify.success(preference.emailAppointmentRemindersEnabled
        ? 'Lembretes por e-mail ativados.'
        : 'Lembretes por e-mail desativados.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível salvar essa preferência.'),
  })
  const notificationItems = supportMode
    ? [...NOTIFICATION_ITEMS, {
        key: 'supportTicketSound' as const,
        label: 'Som para novos chamados',
        description: 'Tocar um aviso quando um novo chamado chegar à central de suporte',
      }]
    : NOTIFICATION_ITEMS

  const logoutAllMutation = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => {
      notify.success('Todas as sessões foram encerradas')
      queryClient.clear()
      logout()
    },
    onError: (err: unknown) => {
      notify.error(extractApiMessage(err) ?? 'Não foi possível encerrar as sessões.')
    },
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      notify.success('Senha alterada com sucesso!')
      reset()
    },
    onError: (err: unknown) => {
      /* O `message` do ValidationPipe chega como ARRAY de strings — nunca
       * usamos `includes` direto nele (daria sempre false). */
      const message = extractApiMessage(err)
      const status = extractApiStatus(err)

      if (isWrongCurrentPassword(err)) {
        notify.error('Senha atual incorreta')
      } else if (status === 400 && message) {
        notify.error(message)
      } else {
        notify.error(message ?? 'Não foi possível alterar a senha. Tente novamente.')
      }
    },
  })

  const requestEmailChangeMutation = useMutation({
    mutationFn: () => authApi.requestEmailChange(emailChangeInput),
    onSuccess: async () => {
      const target = emailChangeInput.trim().toLowerCase()
      setEmailChangeTarget(target)
      setEmailChangeCode('')
      await queryClient.invalidateQueries({ queryKey: ['auth', 'email-change', 'pending'] })
      notify.success(`Enviamos um código para ${target}. Seu e-mail atual continua ativo até a confirmação.`)
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível enviar o código.'),
  })

  const verifyEmailChangeMutation = useMutation({
    mutationFn: () => authApi.verifyEmailChange(emailChangeCode.trim()),
    onSuccess: () => {
      updateUser({ email: visibleEmailChangeTarget })
      setEmailChangeInput('')
      setEmailChangeTarget('')
      setEmailChangeCode('')
      queryClient.setQueryData(['auth', 'email-change', 'pending'], null)
      notify.success('E-mail atualizado e confirmado.')
    },
    onError: (error: unknown) => notify.error(extractApiMessage(error) ?? 'Não foi possível confirmar o e-mail.'),
  })

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const updated = await usersApi.updateProfile({
        name: profileName,
        phone: profilePhone || null,
      })
      updateUser({ name: updated?.name ?? profileName, phone: updated?.phone ?? profilePhone })
      notify.success('Perfil atualizado!')
    } catch (err: unknown) {
      const message = extractApiMessage(err)
      notify.error(
        message
          ? `Não foi possível salvar o perfil: ${message}`
          : 'Não foi possível salvar o perfil. Tente novamente em instantes.'
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  const toggleNotification = (key: keyof NotificationPreferences) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveNotificationPreferences(next)
      return next
    })
  }

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Perfil' },
    { id: 'security' as const, icon: Shield, label: 'Segurança' },
    { id: 'notifications' as const, icon: Bell, label: 'Notificações' },
    { id: 'privacy' as const, icon: LockKeyhole, label: 'Privacidade' },
  ]

  return (
    <>
      <PageHeader>
        <PageTitle>Configurações</PageTitle>
      </PageHeader>

      <PageContent>
        <div className="animate-in">
          <div className="grid gap-6 lg:grid-cols-[12rem_1fr]">
            {/* Sidebar tabs */}
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-soft text-primary-soft-fg font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <>
                  <div className="card p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-2xl font-bold text-primary-soft-fg">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground font-display">{user?.name}</h3>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Membro desde{' '}
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                        <User className="h-5 w-5 text-primary-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Informações pessoais</h3>
                        <p className="text-xs text-muted-foreground">Atualize seus dados</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="label">Nome</label>
                          <Input
                            className="mt-1.5"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="current-email">E-mail atual</label>
                          <Input
                            id="current-email"
                            className="mt-1.5"
                            value={user?.email || ''}
                            disabled
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label">Telefone</label>
                        <Input
                          className="mt-1.5"
                          placeholder="(11) 99999-9999"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSaveProfile}
                        loading={isSavingProfile}
                      >
                        <Save className="h-4 w-4" />
                        Salvar alterações
                      </Button>
                    </div>
                    <div className="mt-6 border-t border-border pt-5">
                      <h4 className="text-sm font-semibold text-foreground">Alterar e-mail</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Enviaremos um código ao novo endereço. O e-mail atual só muda depois da confirmação.
                      </p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <Input
                          id="new-account-email"
                          type="email"
                          label="Novo e-mail"
                          autoComplete="email"
                          value={emailChangeInput}
                          onChange={(event) => setEmailChangeInput(event.target.value)}
                        />
                        <Button
                          variant="outline"
                          loading={requestEmailChangeMutation.isPending}
                          disabled={!emailChangeInput.trim() || emailChangeInput.trim().toLowerCase() === user?.email?.toLowerCase()}
                          onClick={() => requestEmailChangeMutation.mutate()}
                        >
                          Enviar código
                        </Button>
                      </div>
                      {pendingEmailChangeQuery.isError && (
                        <p role="alert" className="mt-2 text-xs text-destructive">
                          Não foi possível consultar uma confirmação pendente. Você pode solicitar um novo código.
                        </p>
                      )}
                      {visibleEmailChangeTarget && (
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                          <Input
                            id="email-change-code"
                            label={`Código enviado para ${visibleEmailChangeTarget}`}
                            autoComplete="one-time-code"
                            maxLength={32}
                            value={emailChangeCode}
                            onChange={(event) => setEmailChangeCode(event.target.value)}
                          />
                          <Button
                            loading={verifyEmailChangeMutation.isPending}
                            disabled={!emailChangeCode.trim()}
                            onClick={() => verifyEmailChangeMutation.mutate()}
                          >
                            Confirmar novo e-mail
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <>
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft">
                        <Key className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Alterar senha</h3>
                        <p className="text-xs text-muted-foreground">Mantenha sua conta segura</p>
                      </div>
                    </div>

                    <form
                      onSubmit={handleSubmit((data) => changePasswordMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <div>
                        <label className="label">Senha atual</label>
                        <Input
                          type="password"
                          className="mt-1.5"
                          placeholder="••••••••"
                          error={errors.currentPassword?.message}
                          {...register('currentPassword')}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="label">Nova senha</label>
                          <Input
                            type="password"
                            className="mt-1.5"
                            placeholder="••••••••"
                            error={errors.newPassword?.message}
                            {...register('newPassword')}
                          />
                        </div>
                        <div>
                          <label className="label">Confirmar senha</label>
                          <Input
                            type="password"
                            className="mt-1.5"
                            placeholder="••••••••"
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        loading={changePasswordMutation.isPending}
                      >
                        <Key className="h-4 w-4" />
                        Alterar senha
                      </Button>
                    </form>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <LogOut className="h-5 w-5 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Sessões</h3>
                        <p className="text-xs text-muted-foreground">Gerencie seus dispositivos conectados</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">
                      Encerrar todas as sessões em outros dispositivos. Você permanecerá conectado neste dispositivo.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => logoutAllMutation.mutate()}
                      loading={logoutAllMutation.isPending}
                    >
                      <LogOut className="h-4 w-4" />
                      Encerrar outras sessões
                    </Button>
                  </div>
                </>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft">
                      <Bell className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Preferências de notificação</h3>
                      <p className="text-xs text-muted-foreground">Escolha o que deseja receber</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {notificationItems.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between rounded-xl border border-border p-4 transition-all hover:border-border-strong"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]}
                            onChange={() => toggleNotification(item.key)}
                            aria-label={item.label}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary">
                            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                          </div>
                        </div>
                      </label>
                    ))}
                    {!supportMode ? (
                      <label className="flex items-center justify-between rounded-xl border border-border p-4 transition-all hover:border-border-strong">
                        <div>
                          <p className="text-sm font-medium text-foreground">Lembretes por e-mail</p>
                          <p className="text-xs text-muted-foreground">Receber um lembrete 24 horas antes dos agendamentos confirmados</p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={reminderPreferenceQuery.data?.emailAppointmentRemindersEnabled ?? false}
                            disabled={reminderPreferenceQuery.isPending || reminderPreferenceMutation.isPending || reminderPreferenceQuery.isError}
                            onChange={(event) => reminderPreferenceMutation.mutate(event.target.checked)}
                            aria-label="Lembretes por e-mail"
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-primary peer-disabled:opacity-50">
                            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                          </div>
                        </div>
                      </label>
                    ) : null}
                  </div>

                  {!supportMode && reminderPreferenceQuery.isError ? (
                    <p role="alert" className="mt-3 text-xs text-destructive">
                      Não foi possível carregar a preferência de lembretes. Tente novamente.
                    </p>
                  ) : null}

                  {supportMode ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      A preferência de som fica salva apenas neste navegador. Por segurança, o navegador libera o áudio após uma interação sua com a área de suporte.
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs text-muted-foreground">
                    {supportMode
                      ? 'Estas preferências ficam salvas apenas neste navegador; as opções de agendamentos ainda não enviam notificações.'
                      : 'Avisos de novos agendamentos e cancelamentos ficam salvos neste navegador. A opção de lembrete por e-mail é salva na sua conta e pode ser desativada quando quiser.'}
                  </p>
                </div>
              )}

              {activeTab === 'privacy' && <PrivacyRequestsPanel />}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}
