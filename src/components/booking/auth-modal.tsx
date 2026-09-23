import { useState, type FormEvent } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/app/providers/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onAuthenticated: () => void
}

type Mode = 'login' | 'register'

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const switchMode = (next: Mode) => {
    setMode(next)
    setPassword('')
    setLoading(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error(mode === 'login' ? 'Informe e-mail e senha' : 'Preencha todos os campos')
      return
    }
    if (mode === 'register' && !name.trim()) {
      toast.error('Informe seu nome')
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        await register(name.trim(), email.trim(), password)
        toast.success('Conta criada! Agora faça login para continuar.')
        setMode('login')
        setPassword('')
      } else {
        await login(email.trim(), password)
        toast.success('Login realizado!')
        onAuthenticated()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(msg || 'Erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 animate-in-scale">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground font-display">
            {mode === 'login' ? 'Entre para agendar' : 'Crie sua conta'}
          </h3>
          <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-lg border border-warm-200 mb-5">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium transition-colors',
                m === 'login' ? 'rounded-l-lg' : 'rounded-r-lg',
                mode === m ? 'bg-primary-50 text-primary-700' : 'text-ink-muted hover:bg-warm-50'
              )}
            >
              {m === 'login' ? 'Login' : 'Cadastro'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              label="Nome"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-7 text-ink-faint hover:text-ink-muted"
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </div>
  )
}