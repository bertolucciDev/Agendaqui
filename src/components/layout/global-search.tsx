import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Scissors, Search, Users, CalendarDays } from 'lucide-react'
import { servicesApi } from '@/services/api/services'
import { locationsApi } from '@/services/api/locations'
import { staffApi } from '@/services/api/staff'
import { appointmentsApi } from '@/services/api/appointments'
import { useActiveBusiness } from '@/app/hooks/use-active-business'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  label: string
  hint?: string
  to: string
  icon: typeof Search
}

const MAX_RESULTS = 8

/**
 * Busca global do painel.
 *
 * Reaproveita as MESMAS chaves de query das páginas (TanStack Query
 * deduplica), então digitar aqui não dispara requisições extras quando o
 * usuário já visited a seção correspondente.
 */
export function GlobalSearch() {
  const navigate = useNavigate()
  const { businessId, activeMode } = useActiveBusiness()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const enabled = !!businessId

  const { data: services = [] } = useQuery({
    queryKey: ['services', activeMode, businessId],
    queryFn: () => servicesApi.list(businessId!),
    enabled,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', activeMode, businessId],
    queryFn: () => locationsApi.list(businessId!),
    enabled,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['staff', activeMode, businessId],
    queryFn: () => staffApi.listByBusiness(businessId!),
    enabled,
  })

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-today', activeMode, businessId],
    queryFn: async () => {
      if (!businessId) return []
      const res = await appointmentsApi.listBusiness(businessId, { limit: 50 })
      return res?.data ?? []
    },
    enabled,
  })

  /* ⌘K / Ctrl+K foca a busca — atalho esperado em painéis densos. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const results = useMemo<SearchResult[]>(() => {
    const q = term.trim().toLowerCase()
    if (!q) return []

    const matches = (value: string | undefined | null) =>
      (value ?? '').toLowerCase().includes(q)

    const found: SearchResult[] = []

    for (const svc of services) {
      if (matches(svc.name)) {
        found.push({
          id: `service-${svc.id}`,
          label: svc.name,
          hint: `${svc.durationMinutes}min`,
          to: '/services',
          icon: Scissors,
        })
      }
    }

    for (const loc of locations) {
      if (matches(loc.name) || matches(loc.address)) {
        found.push({
          id: `location-${loc.id}`,
          label: loc.name,
          hint: loc.address,
          to: '/locations',
          icon: MapPin,
        })
      }
    }

    for (const member of staff) {
      if (matches(member.user?.name) || matches(member.position)) {
        found.push({
          id: `staff-${member.id}`,
          label: member.user?.name ?? member.position,
          hint: member.position,
          to: '/staff',
          icon: Users,
        })
      }
    }

    for (const apt of appointments) {
      if (matches(apt.customer?.name) || matches(apt.service?.name)) {
        found.push({
          id: `appointment-${apt.id}`,
          label: apt.service?.name ?? 'Agendamento',
          hint: apt.customer?.name,
          to: '/appointments',
          icon: CalendarDays,
        })
      }
    }

    return found.slice(0, MAX_RESULTS)
  }, [term, services, locations, staff, appointments])

  /* O índice ativo é limitado ao tamanho da lista — evita o efeito que
   * zerava o destaque a cada tecla (e o render extra que ele causava). */
  const activeIndex = results.length === 0 ? 0 : Math.min(highlighted, results.length - 1)

  const go = (result: SearchResult) => {
    setOpen(false)
    setTerm('')
    inputRef.current?.blur()
    navigate(result.to)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) go(target)
    }
  }

  return (
    <div className="relative mx-3 mt-3" ref={containerRef}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar serviços, locais, equipe..."
        aria-label="Buscar no painel"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-results"
        className="w-full rounded-lg border border-border bg-muted py-1.5 pl-8 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:block">
        ⌘K
      </kbd>

      {open && term.trim() !== '' && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Nada encontrado para “{term.trim()}”.
            </p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => go(result)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                  index === activeIndex ? 'bg-primary-soft' : 'hover:bg-muted'
                )}
              >
                <result.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                  {result.label}
                </span>
                {result.hint && (
                  <span className="max-w-[45%] truncate text-[11px] text-muted-foreground">
                    {result.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
