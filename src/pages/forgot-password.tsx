import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/services/api'
import { extractApiMessage, extractApiStatus } from '@/lib/api-error'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations'
import { notify } from '@/lib/notify'
import { ArrowLeft, CheckCircle2, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Recuperação de senha em DOIS passos na mesma tela:
 *  1. POST /auth/forgot-password { email }  → envia o código por e-mail;
 *  2. POST /auth/reset-password  { email, code, newPassword } → redefine a senha.
 *
 * O passo 2 fica aqui (e não em /reset-password) porque o backend exige o
 * e-mail junto do código — separar as telas obrigaria o usuário a digitar o
 * e-mail de novo, e a rota /reset-password não existe no roteador.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '', code: '', newPassword: '', confirmPassword: '' },
  })

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      notify.error('Digite seu e-mail')
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      setValue('email', email, { shouldValidate: true })
      setCodeSent(true)
      notify.success('Código enviado! Confira seu e-mail.')
    } catch (err: unknown) {
      const status = extractApiStatus(err)
      const message = extractApiMessage(err)

      if (status === 400 && message) {
        notify.error(message)
      } else if (status === 500) {
        notify.error('Erro no servidor. Tente novamente em instantes.')
      } else if (!status) {
        notify.error('Sem conexão. Verifique sua internet.')
      } else {
        notify.error(message ?? 'Não foi possível enviar o código. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const submitReset = async (data: ResetPasswordFormData) => {
    setIsResetting(true)
    try {
      await authApi.resetPassword(data.email, data.code, data.newPassword)
      notify.success('Senha redefinida! Faça login com a nova senha.')
      navigate('/login')
    } catch (err: unknown) {
      const status = extractApiStatus(err)
      const message = extractApiMessage(err)

      if (status === 400 && message) {
        notify.error(message)
      } else if (status === 404) {
        notify.error('E-mail não encontrado. Verifique o endereço digitado.')
      } else if (status === 429) {
        notify.error(message ?? 'Muitas tentativas. Solicite um novo código.')
      } else if (status === 500) {
        notify.error('Erro no servidor. Tente novamente em instantes.')
      } else if (!status) {
        notify.error('Sem conexão. Verifique sua internet.')
      } else {
        notify.error(message ?? 'Código inválido ou expirado. Solicite um novo código.')
      }
    } finally {
      setIsResetting(false)
    }
  }

  if (codeSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>

          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              Agendaqui
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Redefinir senha
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Digite o código de 6 caracteres enviado para{' '}
            <span className="font-medium text-foreground">{email}</span> e escolha a nova
            senha.
          </p>

          <form onSubmit={handleSubmit(submitReset)} className="mt-8 space-y-4">
            <div>
              <label className="label">Código</label>
              <Input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={6}
                placeholder="K3R7M2"
                error={errors.code?.message}
                {...register('code', {
                  onChange: (event) => {
                    setValue('code', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''), {
                      shouldValidate: true,
                    })
                  },
                })}
              />
            </div>

            <div>
              <label className="label">Nova senha</label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres, com letras e números"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
            </div>

            <div>
              <label className="label">Confirmar nova senha</label>
              <Input
                type="password"
                placeholder="Repita a senha"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Button type="submit" loading={isResetting} className="w-full">
              <Key className="h-4 w-4" />
              Redefinir senha
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não recebeu?{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setCodeSent(false)
              }}
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              peça um novo código
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            A
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground font-display">
            Agendaqui
          </span>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Esqueceu a senha?
          </h1>
        </div>

        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um código para redefinir sua senha.
        </p>

        <form onSubmit={requestCode} className="mt-8 space-y-4">
          <div>
            <label className="label">E-mail</label>
            <Input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full"
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            loading={isLoading}
            disabled={!email.trim()}
            className="w-full"
          >
            Enviar código
          </Button>
        </form>
      </div>
    </div>
  )
}
