import { apiClient } from '@/lib/axios/client'
import { getStoredBusinesses, slugify } from '@/lib/business-store'
import type {
  BusinessProfessional,
  Location,
  Membership,
  MembershipInviteResult,
  MembershipInviteRole,
  MembershipRole,
  PaginatedResponse,
  Service,
  TimeOffRequestResult,
  TimeOffRequestType,
  WorkingHoursEntry,
} from '@/types'

/**
 * Visão pública do negócio (`GET /businesses/:slug`).
 * Traz serviços ativos e locais — suficiente para a tela de equipe e o convite.
 */
export interface BusinessPublicView {
  id: string
  slug: string
  name: string
  locations: {
    id: string
    name: string
    address?: string
    timezone?: string
  }[]
  services: {
    id: string
    name: string
    priceCents: number
    durationMinutes: number
    description?: string | null
  }[]
}

/** Catálogo do negócio consumido pela área de equipe. */
export interface BusinessCatalog {
  /** Chave usada nas rotas por slug (`businesses/:slug/...`). */
  key: string
  name?: string
  locations: Location[]
  services: Service[]
}

function unwrapList<T>(payload: T[] | PaginatedResponse<T> | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

/**
 * Descobre a chave de negócio aceita pelas rotas por negócio.
 *
 * O backend resolve o negócio por SLUG **ou** por ID (`BusinessLookupService`),
 * então o id que a sessão entrega (`GET /me/session`) já funciona direto.
 * A busca por slug fica como último recurso, para um backend anterior.
 */
export async function resolveBusinessKey(
  businessId: string,
  businessName?: string
): Promise<string | null> {
  const stored = getStoredBusinesses().find((b) => b.businessId === businessId)
  const candidates = [businessId, stored?.slug, businessName ? slugify(businessName) : undefined]
    .filter((value): value is string => !!value)
    .filter((value, index, list) => list.indexOf(value) === index)

  for (const candidate of candidates) {
    try {
      const { data } = await apiClient.get<BusinessPublicView>(`businesses/${candidate}`)
      if (!data?.id || data.id === businessId) return candidate
    } catch {
      // tenta o próximo candidato
    }
  }

  return null
}

export const staffApi = {
  listByLocation: async (locationId: string): Promise<Membership[]> => {
    const { data } = await apiClient.get<Membership[]>(`locations/${locationId}/employees`)
    return data
  },

  listByBusiness: async (businessId: string): Promise<Membership[]> => {
    const { data } = await apiClient.get<Membership[]>(`businesses/${businessId}/employees`)
    return data
  },

  addEmployee: async (
    locationId: string,
    payload: { userId: string; role: MembershipRole; position: string }
  ): Promise<Membership> => {
    const { data } = await apiClient.post<Membership>(`locations/${locationId}/employees`, payload)
    return data
  },

  updateEmployee: async (
    employeeMembershipId: string,
    payload: { position?: string; active?: boolean; role?: MembershipRole }
  ): Promise<Membership> => {
    const { data } = await apiClient.put<Membership>(
      `employees/${employeeMembershipId}`,
      payload
    )
    return data
  },

  removeEmployee: async (employeeMembershipId: string): Promise<void> => {
    await apiClient.delete(`employees/${employeeMembershipId}`)
  },

  setWorkingHours: async (
    employeeMembershipId: string,
    entries: WorkingHoursEntry[]
  ): Promise<void> => {
    await apiClient.put(`employees/${employeeMembershipId}/working-hours`, { entries })
  },

  requestTimeOff: async (
    employeeMembershipId: string,
    payload: {
      type: TimeOffRequestType
      startAt: string
      endAt: string
      reason?: string
    }
  ): Promise<TimeOffRequestResult> => {
    const { data } = await apiClient.post<TimeOffRequestResult>(
      `employees/${employeeMembershipId}/time-offs`,
      payload
    )
    return data
  },

  approveTimeOff: async (id: string): Promise<void> => {
    await apiClient.put(`time-offs/${id}/approve`)
  },

  rejectTimeOff: async (id: string): Promise<void> => {
    await apiClient.put(`time-offs/${id}/reject`)
  },

  assignProfessional: async (
    serviceId: string,
    employeeMembershipId: string
  ): Promise<void> => {
    await apiClient.post(
      `services/${serviceId}/professionals?employeeMembershipId=${employeeMembershipId}`
    )
  },

  unassignProfessional: async (
    serviceId: string,
    employeeMembershipId: string
  ): Promise<void> => {
    await apiClient.delete(
      `services/${serviceId}/professionals?employeeMembershipId=${employeeMembershipId}`
    )
  },

  inviteEmployee: async (
    businessId: string,
    payload: {
      email: string
      locationId: string
      role: MembershipInviteRole
      position: string
    }
  ): Promise<MembershipInviteResult> => {
    const { data } = await apiClient.post<MembershipInviteResult>(
      `businesses/${businessId}/invites`,
      payload
    )
    return data
  },

  /**
   * Profissionais do negócio com os serviços vinculados de cada um
   * (`GET /businesses/:slug/professionals`). É a fonte de verdade do vínculo
   * profissional↔serviço — a lista de serviços do negócio não devolve o
   * vínculo por membro.
   */
  listProfessionals: async (businessKey: string): Promise<BusinessProfessional[]> => {
    const { data } = await apiClient.get<
      BusinessProfessional[] | PaginatedResponse<BusinessProfessional>
    >(`businesses/${businessKey}/professionals?limit=100`)
    return unwrapList(data)
  },

  /**
   * Serviços do negócio. A rota real é paginada
   * (`{ data, total, limit, offset }`); a lista simples também é aceita.
   */
  listBusinessServices: async (businessKey: string): Promise<Service[]> => {
    const { data } = await apiClient.get<Service[] | PaginatedResponse<Service>>(
      `businesses/${businessKey}/services?limit=100`
    )
    return unwrapList(data)
  },

  /**
   * Catálogo (serviços + locais) do negócio.
   *
   * Vive em `staff.ts` porque é consumido pela área de equipe; quando
   * `servicesApi`/`locationsApi` passarem a usar a chave por slug, esta
   * função pode delegar para elas.
   */
  getBusinessCatalog: async (businessId: string, businessName?: string): Promise<BusinessCatalog | null> => {
    const key = await resolveBusinessKey(businessId, businessName)
    if (!key) return null

    const [detail, services] = await Promise.all([
      apiClient
        .get<BusinessPublicView>(`businesses/${key}`)
        .then((res) => res.data)
        .catch(() => null),
      apiClient
        .get<Service[] | PaginatedResponse<Service>>(`businesses/${key}/services?limit=100`)
        .then((res) => res.data)
        .catch(() => null),
    ])

    const serviceList = unwrapList(services)
    const catalogServices: Service[] =
      serviceList.length > 0
        ? serviceList
        : (detail?.services ?? []).map((svc) => ({
            id: svc.id,
            businessId: detail?.id ?? '',
            categoryId: '',
            name: svc.name,
            priceCents: svc.priceCents,
            durationMinutes: svc.durationMinutes,
            description: svc.description ?? undefined,
            active: true,
          }))

    const locationList = detail?.locations ?? []
    const catalogLocations: Location[] = locationList.map((loc) => ({
      id: loc.id,
      businessId: detail?.id ?? '',
      name: loc.name,
      address: loc.address ?? '',
      timezone: loc.timezone ?? '',
    }))

    return {
      key,
      name: detail?.name ?? businessName,
      services: catalogServices,
      locations: catalogLocations,
    }
  },
}
