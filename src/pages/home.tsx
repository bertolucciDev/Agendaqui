import { Link } from 'react-router-dom'
import { CalendarDays, ArrowRight, Clock, Users, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            A
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground font-display">
            Agendaqui
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Criar conta</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16 lg:py-24">
        <div className="max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-fg">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma de agendamento
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl font-display">
            Agende com
            <span className="text-primary-600"> simplicidade</span>
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto">
            Gerencie negócios, serviços, equipe e agendamentos em um só lugar.
            Uma experiência profissional para você e seus clientes.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Começar agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          <Feature
            icon={CalendarDays}
            title="Negócios"
            description="Cadastre seus estabelecimentos e gerencie tudo em um painel centralizado."
            color="primary"
          />
          <Feature
            icon={Clock}
            title="Serviços"
            description="Defina preços, durações e profissionais responsáveis por cada serviço."
            color="success"
          />
          <Feature
            icon={Users}
            title="Agendamentos"
            description="Seus clientes agendam online. Você confirma, cancela ou conclui em um clique."
            color="accent"
          />
        </div>

        <div className="mt-20 max-w-2xl">
          <div className="card p-8 text-center">
            <h2 className="text-xl font-bold text-foreground font-display">Pronto para começar?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie sua conta gratuita e comece a receber agendamentos hoje mesmo.
            </p>
            <Link to="/register" className="mt-5 inline-flex">
              <Button>
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
        Agendaqui — Plataforma de agendamento
      </footer>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  color: 'primary' | 'success' | 'accent'
}) {
  const colorMap = {
      primary: 'bg-primary-soft text-primary-accent',
      success: 'bg-success-soft text-green-500',
      accent: 'bg-accent text-accent-500',
  }

  return (
    <div className="card-hover p-5 text-left">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3.5 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
