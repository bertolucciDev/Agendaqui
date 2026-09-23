import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react'
import { businessesApi } from '@/services/api/businesses'
import { appointmentsApi } from '@/services/api/appointments'
import { useAuth } from '@/app/providers/auth'
import { AuthModal } from '@/components/booking/auth-modal'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface BookingStep {
  id: string
  title: string
}

const STEPS: BookingStep[] = [
  { id: 'service', title: 'Escolha o serviço' },
  { id: 'datetime', title: 'Escolha data e hora' },
  { id: 'confirm', title: 'Confirme seus dados' },
  { id: 'success', title: 'Agendamento confirmado!' },
]

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const step = STEPS[currentStep]

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['booking-business', slug],
    queryFn: () => businessesApi.getBySlug(slug!),
    enabled: !!slug,
  })

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['booking-services', slug],
    queryFn: () => businessesApi.getServicesBySlug(slug!, 1, 50),
    enabled: !!slug,
  })

  const servicesList = Array.isArray(servicesData) ? servicesData : servicesData?.data || []
  const locationId = business?.locations?.[0]?.id

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['booking-slots', business?.id, selectedService, selectedDate],
    queryFn: async () => {
      if (!business?.id || !selectedService || !selectedDate) return []
      const dateFrom = new Date(selectedDate)
      dateFrom.setHours(0, 0, 0, 0)
      const dateTo = new Date(selectedDate)
      dateTo.setHours(23, 59, 59, 999)
      return appointmentsApi.getAvailableSlots(business.id, {
        serviceId: selectedService,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        locationId: locationId ?? business.id,
      })
    },
    enabled: !!business?.id && !!selectedService && !!selectedDate,
  })

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id || !selectedService || !selectedSlot) return
      const slot = slots.find((s) => s.startsAt === selectedSlot)
      if (!slot) return
      return appointmentsApi.create(business.id, {
        locationId: locationId ?? business.id,
        serviceId: selectedService,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        employeeMembershipId: slot.employeeMembershipId,
        clientName: clientName.trim(),
        clientPhone: clientPhone || undefined,
      })
    },
    onSuccess: (data) => {
      setBookingId(data?.id || '')
      setCurrentStep(3)
      toast.success('Agendamento realizado!')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erro ao agendar')
    },
  })

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setCurrentStep(1)
  }

  const handleSlotSelect = (slotStartsAt: string) => {
    setSelectedSlot(slotStartsAt)
    setCurrentStep(2)
  }

  const handleConfirm = () => {
    if (!clientName.trim()) {
      toast.error('Informe seu nome')
      return
    }
    if (!isAuthenticated) {
      setAuthModalOpen(true)
      return
    }
    bookingMutation.mutate()
  }

  const handleAuthenticated = () => {
    setAuthModalOpen(false)
    bookingMutation.mutate()
  }

  const formatPrice = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const prevWeek = () => {
    if (!selectedDate) return
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 7)
    setSelectedDate(d)
  }

  const nextWeek = () => {
    if (!selectedDate) return
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 7)
    setSelectedDate(d)
  }

  if (loadingBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <EmptyState
          icon={Calendar}
          title="Negócio não encontrado"
          description="Verifique o link e tente novamente."
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-700">
              {business.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground font-display">{business.name}</h1>
              {business.description && (
                <p className="text-xs text-ink-muted">{business.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="border-b border-warm-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                    i < currentStep
                      ? 'bg-primary-500 text-white'
                      : i === currentStep
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400'
                      : 'bg-warm-200 text-ink-faint'
                  )}
                >
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-6 h-0.5 rounded-full', i < currentStep ? 'bg-primary-500' : 'bg-warm-200')} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">{step.title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Step: Service */}
        {currentStep === 0 && (
          <div className="space-y-3">
            {loadingServices ? (
              <div className="flex py-12 justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              servicesList.map((service: any) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="w-full rounded-xl border border-warm-200 p-4 text-left transition-all hover:border-primary-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{service.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-ink-muted" />
                        <span className="text-xs text-ink-muted">{service.durationMinutes}min</span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-primary-600">
                      {formatPrice(service.priceCents)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Date & Time */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevWeek} className="btn-ghost !p-1.5">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedDate
                      ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                      : 'Selecione uma data'}
                  </h3>
                  <button onClick={nextWeek} className="btn-ghost !p-1.5">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-1 text-center text-xs text-ink-muted">
                      {d}
                    </div>
                  ))}
                  {selectedDate &&
                    Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date(selectedDate)
                      d.setDate(d.getDate() - d.getDay() + i)
                      const isSelected = selectedDate.toDateString() === d.toDateString()
                      const isToday = d.toDateString() === new Date().toDateString()
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(new Date(d))}
                          className={cn(
                            'h-10 rounded-lg text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : isToday
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-foreground hover:bg-warm-100'
                          )}
                        >
                          {d.getDate()}
                        </button>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Horários disponíveis</h3>
                  {loadingSlots ? (
                    <div className="flex py-8 justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-8">
                      Nenhum horário disponível para esta data.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot === slot.startsAt
                        return (
                          <button
                            key={slot.startsAt}
                            onClick={() => handleSlotSelect(slot.startsAt)}
                            className={cn(
                              'rounded-lg border p-2 text-sm font-medium transition-all',
                              isSelected
                                ? 'border-primary-400 bg-primary-50 text-primary-700'
                                : 'border-warm-200 text-foreground hover:border-primary-300'
                            )}
                          >
                            {formatTime(slot.startsAt)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button
              variant="ghost"
              onClick={() => setCurrentStep(0)}
              className="w-full"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <Calendar className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedDate?.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {selectedSlot && formatTime(selectedSlot)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50">
                    <Clock className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm text-foreground">
                    {servicesList.find((s: any) => s.id === selectedService)?.name}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <Input
                  label="Seu nome *"
                  placeholder="Nome completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setCurrentStep(1)} className="flex-1">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                loading={bookingMutation.isPending}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {currentStep === 3 && (
          <div className="text-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 mx-auto">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground font-display">Agendamento confirmado!</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Você receberá uma confirmação em breve.
            </p>
            <Card className="mt-6 mx-auto max-w-xs">
              <CardContent>
                <p className="text-xs text-ink-muted">Código do agendamento</p>
                <p className="text-lg font-bold text-primary-600 mt-1">{bookingId.slice(0, 8).toUpperCase()}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  )
}
