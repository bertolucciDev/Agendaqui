import { useState } from 'react'
import { useAuth } from '@/app/providers/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, usersApi } from '@/services/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/validations'
import { PageHeader, PageTitle, PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User,
  Shield,
  LogOut,
  Key,
  Bell,
  Save,
} from 'lucide-react'

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '')

  const logoutAllMutation = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => {
      toast.success('Todas as sessões foram encerradas')
      queryClient.clear()
      logout()
    },
  })

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
      reset()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (msg?.includes('Invalid credentials') || msg?.includes('wrong')) {
        toast.error('Senha atual incorreta')
      } else {
        toast.error('Erro ao alterar senha')
      }
    },
  })

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      await usersApi.updateProfile({ name: profileName, phone: profilePhone || undefined })
      updateUser({ name: profileName, phone: profilePhone })
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Perfil' },
    { id: 'security' as const, icon: Shield, label: 'Segurança' },
    { id: 'notifications' as const, icon: Bell, label: 'Notificações' },
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
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-ink-muted hover:bg-warm-50 hover:text-foreground'
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
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground font-display">{user?.name}</h3>
                        <p className="text-sm text-ink-muted">{user?.email}</p>
                        <p className="text-xs text-ink-faint mt-0.5">
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                        <User className="h-5 w-5 text-primary-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Informações pessoais</h3>
                        <p className="text-xs text-ink-muted">Atualize seus dados</p>
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
                          <label className="label">E-mail</label>
                          <Input
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
                  </div>
                </>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <>
                  <div className="card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-50">
                        <Key className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Alterar senha</h3>
                        <p className="text-xs text-ink-muted">Mantenha sua conta segura</p>
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
                        <p className="text-xs text-ink-muted">Gerencie seus dispositivos conectados</p>
                      </div>
                    </div>

                    <p className="text-sm text-ink-muted mb-4">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50">
                      <Bell className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Preferências de notificação</h3>
                      <p className="text-xs text-ink-muted">Escolha o que deseja receber</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Novos agendamentos', description: 'Receber aviso quando um cliente agendar', enabled: true },
                      { label: 'Cancelamentos', description: 'Receber aviso quando um agendamento for cancelado', enabled: true },
                      { label: 'Lembretes', description: 'Receber lembretes antes dos agendamentos', enabled: false },
                      { label: 'Promoções', description: 'Novidades e dicas do Agendaqui', enabled: false },
                    ].map((item, i) => (
                      <label
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-warm-200 p-4 transition-all hover:border-warm-300"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-ink-muted">{item.description}</p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            defaultChecked={item.enabled}
                            className="peer sr-only"
                          />
                          <div className="h-6 w-11 rounded-full bg-warm-200 transition-colors peer-checked:bg-primary">
                            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}
