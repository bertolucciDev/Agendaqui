import { apiClient } from '@/lib/axios/client'
import type {
  Appointment,
  AppointmentStatus,
  AvailableSlot,
  Membership,
  PaginatedResponse,
  Service,
} from '@/types'

interface RawSlot {
  startsAt: string
  endsAt: string
  employeeMembershipId?: string
  employeeName?: string
  position?: string
}

const toAvailableSlot = (raw: RawSlot): AvailableSlot => ({
  startsAt: raw.startsAt,
  endsAt: raw.endsAt,
  employeeMembershipId: raw.employeeMembershipId,
})

interface RawAppointment {
  id?: string
  appointmentId?: string
  businessId?: string
  locationId?: string
  serviceId?: string
  clientId?: string
  customerUserId?: string
  employeeMembershipId?: string
  status?: AppointmentStatus
  startsAt?: string
  endsAt?: string
  priceCents?: number
  cancelReason?: string
  service?: Service
  employee?: Membership
  client?: Appointment['client']
}

const toAppointment = (raw: RawAppointment): Appointment => ({
  id: raw.id || raw.appointmentId || '',
  businessId: raw.businessId || '',
  locationId: raw.locationId || '',
  serviceId: raw.serviceId || '',
  clientId: raw.clientId || raw.customerUserId || '',
  employeeMembershipId: raw.employeeMembershipId,
  startsAt: raw.startsAt || '',
  endsAt: raw.endsAt || '',
  status: raw.status || 'PENDING',
  priceCents: raw.priceCents,
  cancelReason: raw.cancelReason,
  service: raw.service,
  employee: raw.employee,
  client: raw.client,
})

export const appointmentsApi = {
  create: async (
    businessId: string,
    payload: {
      locationId: string
      serviceId: string
      startsAt: string
      endsAt: string
      employeeMembershipId?: string
      clientName?: string
      clientPhone?: string
    }
  ) => {
    const { data } = await apiClient.post<RawAppointment>(
      `businesses/${businessId}/appointments`,
      payload
    )
    return toAppointment(data)
  },

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
    const { data } = await apiClient.get<PaginatedResponse<RawAppointment>>(
      `businesses/${businessId}/appointments?${searchParams.toString()}`
    )
    return {
      data: data.data.map(toAppointment),
      total: data.total,
      limit: data.limit,
      offset: data.offset,
    }
  },

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
    const { data } = await apiClient.get<Appointment[]>(
      `me/appointments?${searchParams.toString()}`
    )
    return Array.isArray(data) ? data.map(toAppointment) : data
  },

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
    const { data } = await apiClient.get<RawSlot[]>(
      `businesses/${businessId}/slots?${searchParams.toString()}`
    )
    return (Array.isArray(data) ? data : []).map(toAvailableSlot)
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<Appointment>(`appointments/${id}`)
    return data
  },

  confirm: async (id: string, employeeMembershipId: string) => {
    const { data } = await apiClient.patch<Appointment>(
      `appointments/${id}/confirm`,
      { employeeMembershipId }
    )
    return data
  },

  complete: async (id: string, employeeMembershipId: string) => {
    const { data } = await apiClient.patch<Appointment>(
      `appointments/${id}/complete`,
      { employeeMembershipId }
    )
    return data
  },

  noShow: async (id: string, employeeMembershipId: string) => {
    const { data } = await apiClient.patch<Appointment>(
      `appointments/${id}/no-show`,
      { employeeMembershipId }
    )
    return data
  },

  cancel: async (
    id: string,
    reason: string,
    employeeMembershipId?: string
  ) => {
    const { data } = await apiClient.patch<Appointment>(
      `appointments/${id}/cancel`,
      { reason, employeeMembershipId }
    )
    return data
  },
}
