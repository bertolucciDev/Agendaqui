import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/auth'
import { useSession } from '@/app/providers/session'
import { authApi } from '@/services/api'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { extractApiMessage, extractApiStatus } from '@/lib/api-error'
import { maskPhone } from '@/lib/masks'
import { Button } from '@/components/ui/button'
import { AgendaquiMark } from '@/components/shared/agendaqui-mark'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'

export default function RegisterPage() {
  const { register: registerUser, user, updateUser } = useAuth()
  const { refreshSession } = useSession()
  const navigate = useNavigate()
  const [registrationType, setRegistrationType] = useState<'owner' | 'employee'>('owner')
  const [employeeHasAccount, setEmployeeHasAccount] = useState(false)
  const [employeeName, setEmployeeName] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [employeePassword, setEmployeePassword] = useState('')
  const [employeePasswordConfirmation, setEmployeePasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneDisplay, setPhoneDisplay] = useState('')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true)
    try {
      /* POST /users devolve { userId, autoVerified } — NÃO devolve o usuário.
       * autoVerified=false ⇒ a conta ficou PENDING_VERIFICATION e precisa do
       * código de verificação antes do primeiro acesso. */
      const { autoVerified } = await registerUser(data.name, data.email, data.password, data.phone)
      if (autoVerified) {
        // A2: conta pendente re-registrada com a mesma senha — já está verificada.
        notify.success('E-mail confirmado! Faça login.')
        navigate('/login')
        return
      }
      notify.success('Conta criada! Verifique seu e-mail.')
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (err: unknown) {
      const status = extractApiStatus(err)
      const message = extractApiMessage(err)

      if (status === 409) {
        notify.error(message ?? 'E-mail já cadastrado')
      } else if (status === 400 && message) {
        notify.error(message)
      } else {
        notify.error(message ?? 'Erro ao criar conta')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const onAcceptInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inviteCode.length !== 6) {
      notify.error('Digite o código completo de 6 caracteres.')
      return
    }
    if (!employeeHasAccount && employeeName.trim().length < 2) {
      notify.error('Informe seu nome completo.')
      return
    }
    if (!employeeHasAccount && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(employeePassword)) {
      notify.error('A senha deve ter ao menos 8 caracteres, com letras e números.')
      return
    }
    if (!employeeHasAccount && employeePassword !== employeePasswordConfirmation) {
      notify.error('As senhas não conferem.')
      return
    }

    setIsSubmitting(true)
    try {
      await authApi.acceptInvite(
        employeeEmail.trim(),
        inviteCode,
        employeeHasAccount ? undefined : employeeName.trim(),
        employeeHasAccount ? undefined : employeePassword,
      )

      if (user?.email.toLowerCase() === employeeEmail.trim().toLowerCase()) {
        updateUser({ emailVerifiedAt: new Date().toISOString() })
        refreshSession()
        notify.success('Convite aceito. Seu acesso de funcionário já está ativo.')
        navigate('/dashboard')
        return
      }

      notify.success('Convite aceito! Faça login com este e-mail para acessar a equipe.')
      navigate('/login')
    } catch (error: unknown) {
      notify.error(extractApiMessage(error) ?? 'Não foi possível aceitar o convite. Confira o e-mail e o código.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
        <aside aria-hidden="true" className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMnYtMmgzNG0wLTR2Mkgudi0yaDM0bTAtNHYySDJ2LTJoMzQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-bold text-white font-display">
            <AgendaquiMark className="h-9 w-9 rounded-lg" />
            Agendaqui
          </Link>
            <h2 className="mt-20 text-4xl font-bold text-white leading-tight font-display">
              Comece a<br />agendar hoje
            </h2>
          <p className="mt-4 text-green-100 text-lg max-w-sm">
            Crie sua conta gratuita e comece a receber agendamentos em minutos.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {['Sem cartão de crédito', 'Suporte dedicado', 'Cancelamento quando quiser'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-primary-100 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary-200" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        </aside>

        {/* Right panel - form */}
        <main className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-primary-600 font-display">
              <AgendaquiMark className="h-8 w-8 rounded-lg" />
              Agendaqui
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground font-display">
            {registrationType === 'employee' ? 'Cadastro de funcionário' : 'Criar conta'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Fazer login
            </Link>
          </p>

          <div className="mt-6">
            <p className="label mb-2">Tipo de cadastro</p>
            <div className="grid grid-cols-2 rounded-lg border border-border bg-input-bg p-1" role="group" aria-label="Tipo de cadastro">
              <button
                type="button"
                aria-pressed={registrationType === 'owner'}
                onClick={() => setRegistrationType('owner')}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${registrationType === 'owner' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Dono do negócio
              </button>
              <button
                type="button"
                aria-pressed={registrationType === 'employee'}
                onClick={() => setRegistrationType('employee')}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${registrationType === 'employee' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Funcionário
              </button>
            </div>
            {registrationType === 'employee' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Para entrar como funcionário, use o convite enviado pelo negócio.
              </p>
            )}
          </div>

          {registrationType === 'owner' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label">Nome</label>
              <Input
                className="mt-1.5"
                placeholder="Seu nome"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <div>
              <label className="label">E-mail</label>
              <Input
                type="email"
                className="mt-1.5"
                placeholder="seu@email.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div>
              <label className="label">Telefone (opcional)</label>
              <Input
                type="tel"
                className="mt-1.5"
                placeholder="(11) 99999-9999"
                value={phoneDisplay}
                onChange={(e) => {
                  const masked = maskPhone(e.target.value)
                  setPhoneDisplay(masked)
                  setValue('phone', masked, { shouldValidate: true })
                }}
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  className="pr-10"
                  placeholder="Mínimo 8 caracteres"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmar senha</label>
              <Input
                type="password"
                className="mt-1.5"
                placeholder="Repita a senha"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
            >
              Criar conta
            </Button>
          </form>
          ) : (
            <form onSubmit={onAcceptInvite} className="mt-6 space-y-4">
              {!employeeHasAccount && (
                <Input
                  label="Nome completo"
                  autoComplete="name"
                  required
                  value={employeeName}
                  onChange={(event) => setEmployeeName(event.target.value)}
                />
              )}

              <Input
                label="E-mail do convite"
                type="email"
                autoComplete="email"
                required
                value={employeeEmail}
                onChange={(event) => setEmployeeEmail(event.target.value)}
              />

              <Input
                label="Código do convite"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={6}
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                hint="Código de 6 caracteres enviado pelo negócio."
              />

              {!employeeHasAccount && (
                <>
                  <Input
                    label="Criar senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={employeePassword}
                    onChange={(event) => setEmployeePassword(event.target.value)}
                    hint="Mínimo de 8 caracteres, com letras e números."
                  />
                  <Input
                    label="Confirmar senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={employeePasswordConfirmation}
                    onChange={(event) => setEmployeePasswordConfirmation(event.target.value)}
                  />
                </>
              )}

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={employeeHasAccount}
                  onChange={(event) => setEmployeeHasAccount(event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Já tenho uma conta
              </label>

              <Button type="submit" loading={isSubmitting} className="w-full">
                {employeeHasAccount ? 'Aceitar convite' : 'Criar conta e aceitar convite'}
              </Button>
            </form>
          )}
          </div>
        </main>
      </div>
    )
  }
