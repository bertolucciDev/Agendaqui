import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/auth'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    try {
      await login(data.email, data.password)
      toast.success('Login realizado!')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (msg?.includes('Invalid credentials')) {
        toast.error('E-mail ou senha inválidos')
      } else {
        toast.error('Erro ao fazer login')
      }
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
          <Link to="/" className="text-xl font-bold text-white font-display">Agendaqui</Link>
            <h2 className="mt-20 text-4xl font-bold text-white leading-tight font-display">
              Gerencie seus<br />agendamentos
            </h2>
          <p className="mt-4 text-primary-200 text-lg max-w-sm">
            Acesse sua conta para acompanhar sua agenda, clientes e muito mais.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {['Acompanhe sua agenda em tempo real', 'Gerencie seus clientes', 'Relatórios detalhados'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-primary-200 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        </aside>

        {/* Right panel - form */}
        <main className="flex-1 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link to="/" className="text-lg font-bold text-primary-600 font-display">Agendaqui</Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground font-display">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Não tem conta?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">
              Criar conta
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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
              <label className="label">Senha</label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  className="pr-10"
                  placeholder="Sua senha"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full"
            >
              Entrar
            </Button>
            </form>
          </div>
        </main>
      </div>
    )
  }
