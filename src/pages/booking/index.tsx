import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  User,
} from 'lucide-react'
import { businessesApi } from '@/services/api/businesses'
import { appointmentsApi } from '@/services/api/appointments'
import { useAuth } from '@/app/providers/auth'
import { AuthModal } from '@/components/booking/auth-modal'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AvailableSlot, Service } from '@/types'

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
  { id: 'confirm', title: 'Confirme o agendamento' },
  { id: 'success', title: 'Agendamento confirmado!' },
]

export default function BookingPage() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated, user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [bookingId, setBookingId] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const step = STEPS[currentStep]

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['booking-business', slug],
    queryFn: () => businessesApi.getBySlug(slug!),
    enabled: !!slug,
  })

  /* A rota pública de serviços é indexada por SLUG — passar o id do negócio
   * aqui fazia o backend não encontrar nada e a lista de serviços ficava
   * vazia (fluxo de booking morto). */
  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: ['booking-services', slug],
    queryFn: () => businessesApi.getServicesBySlug(slug!, 1, 100),
    enabled: !!slug,
  })

  const servicesList: Service[] = Array.isArray(servicesData)
    ? servicesData
    : servicesData?.data ?? []

  const locations = business?.locations ?? []
  const locationId = selectedLocationId || locations[0]?.id || ''

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['booking-slots', business?.id, selectedService, selectedDate, locationId],
    queryFn: async () => {
      if (!business?.id || !selectedService || !selectedDate || !locationId) return []
      const dateFrom = new Date(selectedDate)
      dateFrom.setHours(0, 0, 0, 0)
      const dateTo = new Date(selectedDate)
      dateTo.setHours(23, 59, 59, 999)
      return appointmentsApi.getAvailableSlots(business.id, {
        serviceId: selectedService,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        locationId,
      })
    },
    enabled: !!business?.id && !!selectedService && !!selectedDate && !!locationId,
  })

  const selectedServiceObj = servicesList.find((s) => s.id === selectedService)

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id || !selectedService || !selectedSlot || !locationId) {
        throw new Error('Seleção incompleta')
      }
      return appointmentsApi.create(business.id, {
        locationId,
        serviceId: selectedService,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        employeeMembershipId: selectedSlot.employeeMembershipId,
      })
    },
    onSuccess: (data) => {
      setBookingId(data?.id || '')
      setCurrentStep(3)
      notify.success('Agendamento realizado!')
    },
    onError: (err: unknown) => {
      /* 401 = token expirado: a página é pública, então pedimos o login
       * em vez de despejar um erro técnico no cliente. */
      const status = (err as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 401) {
        setAuthModalOpen(true)
        return
      }
      notify.error(err, { retry: () => bookingMutation.mutate() })
    },
  })

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setSelectedSlot(null)
    setCurrentStep(1)
  }

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setCurrentStep(2)
  }

  const handleConfirm = () => {
    if (!selectedSlot) {
      notify.warning('Escolha um horário disponível')
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

  const formatTime = (iso: string | undefined) => {
    if (!iso) return '--:--'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '--:--'
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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-base font-semibold text-foreground font-display">
            Negócio não encontrado
          </h1>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Verifique o link e tente novamente.
          </p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary-soft-fg">
              {business.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground font-display">{business.name}</h1>
              {business.description && (
                <p className="text-xs text-muted-foreground">{business.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <section aria-label="Progresso do agendamento" className="border-b border-border bg-surface">
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
                        ? 'bg-primary-soft text-primary-soft-fg ring-2 ring-primary-400'
                        : 'bg-border text-muted-foreground'
                  )}
                >
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-6 rounded-full',
                      i < currentStep ? 'bg-primary-500' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-medium text-foreground">{step.title}</p>
        </div>
      </section>

      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Step: Service */}
        {currentStep === 0 && (
          <div className="space-y-3">
            {loadingServices ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : servicesList.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Este negócio ainda não publicou serviços.
              </p>
            ) : (
              servicesList.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="w-full rounded-xl border border-border p-4 text-left transition-all hover:border-primary-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{service.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">
                          {service.durationMinutes}min
                        </span>
                        {service.description && (
                          <span className="truncate text-xs text-muted-foreground">
                            · {service.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-primary-soft-fg">
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
            {locations.length > 1 && (
              <Card>
                <CardContent>
                  <label className="label" htmlFor="booking-location">
                    Onde você quer ser atendido
                  </label>
                  <select
                    id="booking-location"
                    className="input mt-1.5"
                    value={locationId}
                    onChange={(e) => {
                      setSelectedLocationId(e.target.value)
                      setSelectedSlot(null)
                    }}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  <button onClick={prevWeek} className="btn-ghost !p-1.5" aria-label="Semana anterior">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedDate
                      ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                      : 'Selecione uma data'}
                  </h3>
                  <button onClick={nextWeek} className="btn-ghost !p-1.5" aria-label="Próxima semana">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="py-1 text-center text-xs text-muted-foreground">
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
                          onClick={() => {
                            setSelectedDate(new Date(d))
                            setSelectedSlot(null)
                          }}
                          aria-pressed={isSelected}
                          className={cn(
                            'h-10 rounded-lg text-sm font-medium transition-all',
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : isToday
                                ? 'bg-primary-soft text-primary-soft-fg'
                                : 'text-foreground hover:bg-muted'
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
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    Horários disponíveis
                  </h3>
                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum horário disponível para esta data.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const isSelected =
                          selectedSlot?.startsAt === slot.startsAt &&
                          selectedSlot?.endsAt === slot.endsAt
                        return (
                          <button
                            key={`${slot.startsAt}-${slot.employeeMembershipId ?? ''}`}
                            onClick={() => handleSlotSelect(slot)}
                            aria-pressed={isSelected}
                            className={cn(
                              'rounded-lg border p-2 text-sm font-medium transition-all',
                              isSelected
                                ? 'border-primary-400 bg-primary-soft text-primary-soft-fg'
                                : 'border-border text-foreground hover:border-primary-300'
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

            <Button variant="ghost" onClick={() => setCurrentStep(0)} className="w-full">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                    <Calendar className="h-5 w-5 text-primary-500" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-foreground">
                      {selectedDate?.toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(selectedSlot?.startsAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft">
                    <Clock className="h-5 w-5 text-green-500" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-foreground">{selectedServiceObj?.name}</p>
                </div>

                {locationId && locations.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <MapPin className="h-5 w-5 text-accent-500" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-foreground">
                      {locations.find((l) => l.id === locationId)?.name ?? '—'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm font-medium text-foreground">Total</p>
                  <p className="text-lg font-bold text-primary-soft-fg">
                    {selectedServiceObj ? formatPrice(selectedServiceObj.priceCents) : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  {isAuthenticated && user ? (
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Entre para confirmar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        O agendamento fica vinculado à sua conta.
                      </p>
                    </div>
                  )}
                </div>
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
                {isAuthenticated ? 'Confirmar' : 'Entrar e confirmar'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {currentStep === 3 && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
              <Check className="h-8 w-8 text-green-500" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground font-display">
              Agendamento confirmado!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você receberá uma confirmação em breve.
            </p>
            {bookingId && (
              <Card className="mx-auto mt-6 max-w-xs">
                <CardContent>
                  <p className="text-xs text-muted-foreground">Código do agendamento</p>
                  <p className="mt-1 text-lg font-bold text-primary-soft-fg">
                    {bookingId.slice(0, 8).toUpperCase()}
                  </p>
                </CardContent>
              </Card>
            )}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => navigate('/my-notifications')}
              >
                Ver meus lembretes
              </Button>
            ) : null}
          </div>
        )}
      </main>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  )
}
