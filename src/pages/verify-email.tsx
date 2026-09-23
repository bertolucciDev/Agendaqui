import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { authApi } from '@/services/api'
import { useAuth } from '@/app/providers/auth'
import toast from 'react-hot-toast'
import { CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const email = searchParams.get('email') || user?.email || ''
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''))
    setCode(newCode)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const codeStr = code.join('')
    if (codeStr.length !== 6) {
      toast.error('Digite o código completo de 6 dígitos')
      return
    }

    setIsLoading(true)
    try {
      await authApi.verifyEmail(email, codeStr)
      setIsVerified(true)
      toast.success('E-mail verificado com sucesso!')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 400 || status === 422) {
        toast.error('Código inválido. Verifique o código enviado ao seu e-mail.')
      } else if (status === 404) {
        toast.error('E-mail não encontrado. Solicite um novo código.')
      } else if (status === 500) {
        toast.error('Erro no servidor. Tente novamente em instantes.')
      } else if (!err?.response) {
        toast.error('Sem conexão. Verifique sua internet.')
      } else {
        toast.error('Código inválido ou expirado. Solicite um novo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  if (isVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground font-display">
            E-mail verificado!
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {user
              ? 'Sua conta está ativa. Acesse seu painel.'
              : 'Sua conta está pronta. Faça login para continuar.'}
          </p>
          <Button onClick={handleContinue} className="mt-6">
            {user ? 'Ir para o painel' : 'Fazer login'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          to={user ? '/dashboard' : '/register'}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
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
          Verificar e-mail
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Digite o código de 6 dígitos enviado para{' '}
          <span className="font-medium text-foreground">{email || 'seu e-mail'}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="flex justify-between gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className={cn(
                  'h-12 w-12 rounded-lg border bg-white text-center text-lg font-semibold text-foreground shadow-xs transition-all duration-150',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15',
                  'disabled:opacity-50',
                  'sm:h-14 sm:w-14 sm:text-xl',
                  digit ? 'border-primary' : 'border-warm-200'
                )}
              />
            ))}
          </div>

          <Button
            type="submit"
            loading={isLoading}
            disabled={code.join('').length !== 6}
            className="mt-6 w-full"
          >
            Verificar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Não recebeu o código? Verifique sua caixa de spam ou{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            crie uma nova conta
          </Link>
        </p>
      </div>
    </div>
  )
}
