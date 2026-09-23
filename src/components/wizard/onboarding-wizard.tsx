import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Building2, MapPin, Scissors, Users } from 'lucide-react'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
}

const STEPS: WizardStep[] = [
  {
    id: 'business',
    title: 'Seu negócio',
    description: 'Como se chama seu estabelecimento?',
    icon: Building2,
  },
  {
    id: 'location',
    title: 'Localização',
    description: 'Onde seu negócio fica?',
    icon: MapPin,
  },
  {
    id: 'services',
    title: 'Serviços',
    description: 'Quais serviços você oferece?',
    icon: Scissors,
  },
  {
    id: 'team',
    title: 'Equipe',
    description: 'Quem trabalha com você?',
    icon: Users,
  },
]

interface OnboardingWizardProps {
  onComplete?: (data: any) => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<Record<string, any>>({})

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  const next = () => {
    if (isLast) {
      onComplete?.(data)
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  const prev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1)
  }

  const updateData = (field: string, value: string) => {
    setData((d) => ({ ...d, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  i < currentStep
                    ? 'bg-brand-500 text-white'
                    : i === currentStep
                    ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400'
                    : 'bg-warm-200 text-ink-faint'
                }`}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 mx-auto mb-4">
            <step.icon className="h-8 w-8 text-brand-500" />
          </div>

          <h2 className="text-xl font-bold text-ink">{step.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{step.description}</p>

          <div className="mt-6 text-left">
            {step.id === 'business' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Nome do negócio</label>
                  <input
                    type="text"
                    className="input mt-1.5"
                    placeholder="Ex: Barbearia Elite"
                    value={data.businessName || ''}
                    onChange={(e) => updateData('businessName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <div className="flex gap-2 mt-1.5">
                    {['COMPANY', 'INDIVIDUAL'].map((type) => (
                      <button
                        key={type}
                        onClick={() => updateData('businessType', type)}
                        className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-all ${
                          data.businessType === type
                            ? 'border-brand-400 bg-brand-50 text-brand-700'
                            : 'border-warm-300 text-ink-muted hover:border-warm-400'
                        }`}
                      >
                        {type === 'COMPANY' ? 'Empresa' : 'Individual'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step.id === 'location' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Endereço</label>
                  <input
                    type="text"
                    className="input mt-1.5"
                    placeholder="Rua, número, bairro"
                    value={data.address || ''}
                    onChange={(e) => updateData('address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Cidade</label>
                    <input
                      type="text"
                      className="input mt-1.5"
                      placeholder="Sua cidade"
                      value={data.city || ''}
                      onChange={(e) => updateData('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <input
                      type="text"
                      className="input mt-1.5"
                      placeholder="UF"
                      maxLength={2}
                      value={data.state || ''}
                      onChange={(e) => updateData('state', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>
            )}

            {step.id === 'services' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Nome do serviço</label>
                  <input
                    type="text"
                    className="input mt-1.5"
                    placeholder="Ex: Corte masculino"
                    value={data.serviceName || ''}
                    onChange={(e) => updateData('serviceName', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Preço (R$)</label>
                    <input
                      type="number"
                      className="input mt-1.5"
                      placeholder="0,00"
                      value={data.price || ''}
                      onChange={(e) => updateData('price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Duração (min)</label>
                    <input
                      type="number"
                      className="input mt-1.5"
                      placeholder="30"
                      value={data.duration || ''}
                      onChange={(e) => updateData('duration', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step.id === 'team' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Nome do funcionário</label>
                  <input
                    type="text"
                    className="input mt-1.5"
                    placeholder="Nome completo"
                    value={data.staffName || ''}
                    onChange={(e) => updateData('staffName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">E-mail (para convite)</label>
                  <input
                    type="email"
                    className="input mt-1.5"
                    placeholder="funcionario@email.com"
                    value={data.staffEmail || ''}
                    onChange={(e) => updateData('staffEmail', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prev}
            disabled={isFirst}
            className="btn-ghost disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>

          <button onClick={next} className="btn-primary">
            {isLast ? (
              <>
                Finalizar
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
