import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Digite seu e-mail')
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      setIsSuccess(true)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404) {
        toast.error('E-mail não encontrado. Crie uma conta primeiro.')
      } else if (status === 500) {
        toast.error('Erro no servidor. Tente novamente em instantes.')
      } else if (!err?.response) {
        toast.error('Sem conexão. Verifique sua internet.')
      } else {
        toast.error('Não foi possível enviar o código. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground font-display">
            Código enviado!
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Verifique sua caixa de entrada em{' '}
            <span className="font-medium text-foreground">{email}</span> e use o código
            para redefinir sua senha.
          </p>
          <Link to="/reset-password">
            <Button className="mt-6">
              Redefinir senha
            </Button>
          </Link>
          <p className="mt-4 text-xs text-ink-faint">
            Não recebeu? Verifique sua caixa de spam.
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
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-foreground"
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
          Esqueceu a senha?
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Informe seu e-mail e enviaremos um código para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label">E-mail</label>
            <Input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1.5"
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
