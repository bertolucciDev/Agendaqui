import { useState } from 'react'
import { useSession } from '@/app/providers/session'
import { useWorkspace } from '@/app/providers/workspace'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { SessionMode } from '@/types/session'

const MODE_LABELS: Record<SessionMode, { title: string; desc: string }> = {
  OWNER: { title: 'Gestão', desc: 'Administre negócio, equipe e agenda.' },
  PROFESSIONAL: { title: 'Profissional', desc: 'Sua agenda e atendimentos.' },
  CUSTOMER: { title: 'Cliente', desc: 'Acompanhe seus agendamentos.' },
}

/**
 * WorkspaceGate — seletor de contexto quando a resolução é ambígua (nunca businesses[0]).
 * A escolha alimenta cache/preferences; troca posterior não exige logout.
 */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { session, isSessionLoading } = useSession()
  const { activeMode, businessesForMode, needsSelection, switchMode, switchBusiness } = useWorkspace()
  const [pickedMode, setPickedMode] = useState<SessionMode | null>(null)

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!session || !needsSelection) return <>{children}</>

  const modes = session.availableModes
  const effectiveMode = activeMode ?? pickedMode

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-foreground font-display">Como você quer entrar?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {modes.length === 0
            ? 'Sua conta ainda não possui contexto disponível.'
            : 'Escolha o modo de atuação. Você pode trocar a qualquer momento, sem sair da conta.'}
        </p>

        {modes.length > 0 && (
          <div className="mt-5 space-y-2" role="radiogroup" aria-label="Modo de atuação">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={effectiveMode === m}
                onClick={() => {
                  setPickedMode(m)
                  switchMode(m)
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  effectiveMode === m
                    ? 'border-primary-400 bg-primary-soft'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{MODE_LABELS[m].title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{MODE_LABELS[m].desc}</p>
              </button>
            ))}
          </div>
        )}

        {effectiveMode && effectiveMode !== 'CUSTOMER' && (
          <div className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold text-foreground font-display">Escolha o negócio</h2>
            {businessesForMode.length === 0 ? (
              <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                  Nenhum negócio disponível para este modo.
                </CardContent>
              </Card>
            ) : (
              businessesForMode.map((b) => (
                <Button
                  key={b.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => switchBusiness(b.id)}
                >
                  {b.name}
                </Button>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}
