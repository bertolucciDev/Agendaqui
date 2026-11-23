import { apiClient } from '@/lib/axios/client'
import type {
  Appointment,
  AppointmentStatus,
  AvailableSlot,
  Location,
  Membership,
  PaginatedResponse,
  Service,
} from '@/types'

/**
 * Resposta crua do backend.
 *
 * O backend nomeia o profissional `employeeMembership` e o cliente `customer`;
 * o contrato do front usa `employee` e `client`. Os aliases são aceitos nos
 * dois sentidos para que o mapper funcione contra qualquer versão da API.
 */
interface RawSlot {
  startsAt?: string
  endsAt?: string
  startAt?: string
  endAt?: string
  employeeMembershipId?: string
  professionalId?: string
  professionalName?: string
  employeeName?: string
  position?: string
}

const toAvailableSlot = (raw: RawSlot): AvailableSlot => ({
  startsAt: raw.startsAt ?? raw.startAt ?? '',
  endsAt: raw.endsAt ?? raw.endAt ?? '',
  employeeMembershipId: raw.employeeMembershipId ?? raw.professionalId,
})

/**
 * Shape cru do agendamento. O contrato com o backend é CONGELADO e usa o
 * vocabulário do domínio: `customerUserId`, `employeeMembershipId`,
 * `cancellationReason`, `customer`, `employeeMembership`.
 */
interface RawAppointment {
  id?: string
  appointmentId?: string
  businessId?: string
  locationId?: string
  serviceId?: string
  customerUserId?: string
  employeeMembershipId?: string
  status?: AppointmentStatus
  startsAt?: string
  endsAt?: string
  priceCents?: number
  cancellationReason?: string
  service?: Service
  employeeMembership?: Membership
  customer?: Appointment['customer']
  location?: Location
}

const toAppointment = (raw: RawAppointment): Appointment => ({
  id: raw.id || raw.appointmentId || '',
  businessId: raw.businessId || '',
  locationId: raw.locationId || '',
  serviceId: raw.serviceId || '',
  customerUserId: raw.customerUserId || '',
  employeeMembershipId: raw.employeeMembershipId,
  startsAt: raw.startsAt || '',
  endsAt: raw.endsAt || '',
  status: raw.status || 'PENDING',
  priceCents: raw.priceCents,
  cancellationReason: raw.cancellationReason,
  service: raw.service,
  employeeMembership: raw.employeeMembership,
  customer: raw.customer,
  location: raw.location,
})

/**
 * O backend paginado devolve `{ data, total, limit, offset }`. As versões
 * antigas devolviam um array puro — aceitamos os dois para não quebrar.
 */
function unwrapList<T>(
  payload: T[] | PaginatedResponse<T> | null | undefined
): { items: T[]; total: number; limit: number; offset: number } {
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length, limit: payload.length, offset: 0 }
  }
  if (payload && Array.isArray(payload.data)) {
    return {
      items: payload.data,
      total: payload.total ?? payload.data.length,
      limit: payload.limit ?? payload.data.length,
      offset: payload.offset ?? 0,
    }
  }
  return { items: [], total: 0, limit: 0, offset: 0 }
}

export const appointmentsApi = {
  /** `GET /me/agenda` — compromissos próprios no negócio selecionado. */
  listProfessionalAgenda: async (params: {
    businessId: string
    dateFrom: string
    dateTo: string
    limit?: number
  }): Promise<Appointment[]> => {
    const searchParams = new URLSearchParams({
      businessId: params.businessId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    })
    if (params.limit) searchParams.set('limit', String(params.limit))

    const { data } = await apiClient.get<RawAppointment[]>(`me/agenda?${searchParams.toString()}`)
    return Array.isArray(data) ? data.map(toAppointment) : []
  },

  /**
   * `POST /businesses/:businessId/appointments`
   *
   * O DTO do backend NÃO aceita `clientName`/`clientPhone` — e como a
   * ValidationPipe global roda com `forbidNonWhitelisted`, enviá-los
   * devolve HTTP 400. O cliente do agendamento é o usuário autenticado.
   */
  create: async (
    businessId: string,
    payload: {
      locationId: string
      serviceId: string
      startsAt: string
      endsAt: string
      employeeMembershipId?: string
    }
  ) => {
    const { data } = await apiClient.post<RawAppointment>(
      `businesses/${businessId}/appointments`,
      payload
    )
    return toAppointment(data)
  },

  /**
   * `GET /businesses/:businessId/appointments` — paginado.
   * `dateFrom`/`dateTo` aceitam data-hora ISO ou data pura (`YYYY-MM-DD`).
   */
  listBusiness: async (
    businessId: string,
    params?: {
      status?: AppointmentStatus
      dateFrom?: string
      dateTo?: string
      limit?: number
      offset?: number
    }
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const { data } = await apiClient.get<PaginatedResponse<RawAppointment> | RawAppointment[]>(
      `businesses/${businessId}/appointments?${searchParams.toString()}`
    )
    const { items, total, limit, offset } = unwrapList(data)
    return {
      data: items.map(toAppointment),
      total,
      limit,
      offset,
    }
  },

  /** `GET /me/appointments` — array puro (não paginado). */
  listMy: async (params?: {
    status?: AppointmentStatus
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.set('dateTo', params.dateTo)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const { data } = await apiClient.get<RawAppointment[]>(
      `me/appointments?${searchParams.toString()}`
    )
    return Array.isArray(data) ? data.map(toAppointment) : []
  },

  /**
   * `GET /businesses/:businessId/slots`
   * `locationId` é obrigatório e precisa ser o id real de um local —
   * não o id do negócio. `dateFrom`/`dateTo` são data-hora ISO.
   */
  getAvailableSlots: async (
    businessId: string,
    params: {
      serviceId: string
      dateFrom: string
      dateTo: string
      locationId: string
      professionalId?: string
    }
  ) => {
    const searchParams = new URLSearchParams()
    searchParams.set('serviceId', params.serviceId)
    searchParams.set('dateFrom', params.dateFrom)
    searchParams.set('dateTo', params.dateTo)
    searchParams.set('locationId', params.locationId)
    if (params.professionalId) searchParams.set('professionalId', params.professionalId)
    const { data } = await apiClient.get<RawSlot[] | PaginatedResponse<RawSlot>>(
      `businesses/${businessId}/slots?${searchParams.toString()}`
    )
    return unwrapList(data).items.map(toAvailableSlot)
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<RawAppointment>(`appointments/${id}`)
    return toAppointment(data)
  },

  /**
   * As quatro mutações de status devolvem 204 (corpo vazio) — o front
   * precisa refazer o GET para refletir o novo estado.
   */
  confirm: async (id: string, employeeMembershipId: string): Promise<void> => {
    await apiClient.patch(`appointments/${id}/confirm`, { employeeMembershipId })
  },

  complete: async (id: string, employeeMembershipId: string): Promise<void> => {
    await apiClient.patch(`appointments/${id}/complete`, { employeeMembershipId })
  },

  noShow: async (id: string, employeeMembershipId: string): Promise<void> => {
    await apiClient.patch(`appointments/${id}/no-show`, { employeeMembershipId })
  },

  cancel: async (id: string, reason: string, employeeMembershipId?: string): Promise<void> => {
    await apiClient.patch(`appointments/${id}/cancel`, { reason, employeeMembershipId })
  },
}
