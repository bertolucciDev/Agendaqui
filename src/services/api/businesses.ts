import { apiClient } from '@/lib/axios/client'
import {
  getStoredBusinesses,
  removeStoredBusiness,
  saveStoredBusiness,
  slugify,
  type StoredBusiness,
} from '@/lib/business-store'
import type { Business, PaginatedResponse, Service } from '@/types'

const toBusiness = (stored: StoredBusiness): Business => ({
  id: stored.businessId,
  name: stored.name,
  slug: stored.slug,
  document: '',
  type: 'COMPANY',
  categoryId: '',
  createdAt: '',
})

/**
 * Erro lançado quando alguém tenta criar um negócio pela rota antiga.
 *
 * `POST /businesses` responde **410 GONE** por decisão de produto: a criação
 * de negócios acontece exclusivamente pelo fluxo de Business Verification
 * (`POST /me/business-verification` → documentos → `submit` → aprovação
 * administrativa), que cria o Business + um Local + a membership OWNER de
 * forma atômica.
 */
export class BusinessCreationMovedError extends Error {
  constructor() {
    super(
      'A criação de negócios passou pelo fluxo de verificação. Use POST /me/business-verification.'
    )
    this.name = 'BusinessCreationMovedError'
  }
}

export const businessesApi = {
  /**
   * @deprecated A lista de negócios do usuário vem do contrato `GET /me/session`
   * (`session.businesses`), que é a fonte de verdade multi-tenant. Esta função
   * lê um registro em localStorage e NÃO reflete o backend — mantenha-a apenas
   * como compatibilidade e prefira `useSession().session.businesses`.
   */
  list: async (): Promise<Business[]> => {
    return getStoredBusinesses().map(toBusiness)
  },

  /**
   * @deprecated `POST /businesses` responde 410. Use o fluxo de Business
   * Verification (`src/pages/onboarding.business.tsx`). A função lança para
   * que nenhum chamador legado passe silenciosamente.
   */
  create: async (): Promise<Business> => {
    throw new BusinessCreationMovedError()
  },

  update: async (id: string, payload: Partial<Business>) => {
    const { data } = await apiClient.put<Business>(`businesses/${id}`, payload)
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`businesses/${id}`)
    removeStoredBusiness(id)
  },

  getBySlug: async (slug: string) => {
    const { data } = await apiClient.get<Business>(`businesses/${slug}`)
    return data
  },

  /**
   * `GET /businesses/:slug/services` — paginado.
   * A rota é indexada por SLUG (não pelo id do negócio).
   */
  getServicesBySlug: async (slug: string, page?: number, limit?: number) => {
    const params = new URLSearchParams()
    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    const { data } = await apiClient.get<PaginatedResponse<Service> | Service[]>(
      `businesses/${slug}/services?${params.toString()}`
    )
    if (Array.isArray(data)) {
      return { data, total: data.length, limit: data.length, offset: 0 }
    }
    return data
  },
}

/** Registro local legado — usado apenas pelo mock e pelo onboarding antigo. */
export function rememberBusiness(params: {
  businessId: string
  locationId?: string
  membershipId?: string
  name: string
}): void {
  const stored: StoredBusiness = {
    businessId: params.businessId,
    locationId: params.locationId ?? '',
    membershipId: params.membershipId ?? '',
    slug: slugify(params.name),
    name: params.name,
  }
  saveStoredBusiness(stored)
}
