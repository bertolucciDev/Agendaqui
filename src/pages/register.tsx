import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/auth'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterFormData } from '@/lib/validations'
import { maskPhone } from '@/lib/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneDisplay, setPhoneDisplay] = useState('')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true)
    try {
      await registerUser(data.name, data.email, data.password, data.phone)
      toast.success('Conta criada!')
      navigate('/login')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (msg?.includes('already exists')) {
        toast.error('E-mail já cadastrado')
      } else {
        toast.error('Erro ao criar conta')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
        <aside aria-hidden="true" className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzRtMC00djJIMnYtMmgzNG0wLTR2Mkgudi0yaDM0bTAtNHYySDJ2LTJoMzQiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <Link to="/" className="text-xl font-bold text-white font-display">Agendaqui</Link>
            <h2 className="mt-20 text-4xl font-bold text-white leading-tight font-display">
              Comece a<br />agendar hoje
            </h2>
          <p className="mt-4 text-green-100 text-lg max-w-sm">
            Crie sua conta gratuita e comece a receber agendamentos em minutos.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {['Sem cartão de crédito', 'Suporte dedicado', 'Cancelamento quando quiser'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-green-100 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-200" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        </aside>

        {/* Right panel - form */}
        <main className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link to="/" className="text-lg font-bold text-primary-600 font-display">Agendaqui</Link>
          </div>

          <h1 className="text-2xl font-bold text-foreground font-display">Criar conta</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Fazer login
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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
                  placeholder="Mínimo 6 caracteres"
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
          </div>
        </main>
      </div>
    )
  }
