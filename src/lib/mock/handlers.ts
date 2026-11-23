import {
  getDb,
  saveDb,
  nextId,
  slugify,
  dateOffsetKey,
  type MockAppointment,
  type MockAppointmentStatus,
  type MockBusinessVerification,
  type MockMembership,
  type MockService,
  type MockVerificationDocument,
  type MockDb,
  type MeSessionPayload,
  type SessionMode,
  type SessionBusinessPayload,
  type SessionMembershipPayload,
} from './db'
import { isValidCnpj, isValidCpf } from '@/lib/validations'

export class ApiError extends Error {
  status: number
  details?: string

  constructor(status: number, message: string, details?: string) {
    super(message)
    this.status = status
    this.details = details
  }
}

export interface MockResponse {
  status: number
  body: unknown
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

function toDateKey(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10)
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentUser() {
  const db = getDb()
  let token: string | null = null
  try {
    token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null
  } catch {
    token = null
  }
  const tokenId = token?.startsWith('mock-user-') ? token.slice('mock-user-'.length) : null
  const id = tokenId || db.sessionUserId
  return db.users.find((u) => u.id === id) || null
}

/* ───── CONTRACT FREEZE: matriz mínima role→permissions (server-computed) ───── */
const ROLE_PERMISSIONS: Record<MockMembership['role'], string[]> = {
  OWNER: ['business:manage', 'staff:write', 'services:write', 'appointments:write', 'appointments:read', 'customers:read'],
  MANAGER: ['staff:write', 'services:write', 'appointments:write', 'appointments:read', 'customers:read'],
  EMPLOYEE: ['appointments:write', 'appointments:read', 'customers:read'],
}

/* Derivação congelada: OWNER/MANAGER ⇒ modo OWNER; EMPLOYEE ⇒ PROFESSIONAL; CustomerProfile ⇒ CUSTOMER.
 * PARIDADE backend: ownership = Business.ownerUserId; se o dono não tem membership real no business,
 * projeta membership virtual `virtual-owner:<id>` (nunca persistida) com todos os locais ativos. */
function buildMeSession(db: MockDb, userId: string): MeSessionPayload {
  const memberships = db.memberships.filter((m) => m.userId === userId && m.active)
  const owned = db.businesses.filter((b) => b.ownerUserId === userId && b.status !== 'INACTIVE' && b.status !== 'BLOCKED')
  const memberBusinesses = db.businesses.filter((b) => memberships.some((m) => m.businessId === b.id))

  const activeLocationIds = (businessId: string) =>
    db.locations.filter((l) => l.businessId === businessId && l.status === 'ACTIVE').map((l) => l.id)

  const realPayload = (m: MockMembership): SessionMembershipPayload => ({
    id: m.id,
    role: m.role,
    // OWNER/MANAGER (gestão) enxergam todos os locais ativos do business;
    // EMPLOYEE fica restrito ao(s) local(is) da própria membership.
    locationIds:
      m.role === 'EMPLOYEE' ? (m.locationId ? [m.locationId] : []) : activeLocationIds(m.businessId),
    permissions: ROLE_PERMISSIONS[m.role],
    active: m.active,
  })

  const ownedBusinesses: SessionBusinessPayload[] = owned.map((b) => {
    const real = memberships.filter((m) => m.businessId === b.id)
    return {
      id: b.id,
      name: b.name,
      memberships:
        real.length > 0
          ? real.map(realPayload)
          : [
              {
                id: `virtual-owner:${b.id}`,
                role: 'OWNER' as const,
                locationIds: activeLocationIds(b.id),
                permissions: ROLE_PERMISSIONS.OWNER,
                active: true,
              },
            ],
    }
  })

  const memberOnly = memberBusinesses
    .filter((b) => !owned.some((o) => o.id === b.id))
    .map((b) => ({
      id: b.id,
      name: b.name,
      memberships: memberships.filter((m) => m.businessId === b.id).map(realPayload),
    }))

  const businesses = [...ownedBusinesses, ...memberOnly]

  const customerProfile = db.customerProfiles.find((c) => c.userId === userId) || null

  const availableModes: SessionMode[] = []
  if (owned.length > 0 || memberships.some((m) => m.role === 'OWNER' || m.role === 'MANAGER')) availableModes.push('OWNER')
  if (memberships.some((m) => m.role === 'EMPLOYEE')) availableModes.push('PROFESSIONAL')
  if (customerProfile) availableModes.push('CUSTOMER')

  const prefs = db.preferences[userId] || { activeMode: null, activeBusinessId: null }

  /* Super_admin (platform admin): usuário com e-mail reservado — sem businesses
   * e sem modos de negócio, igual o backend real. O FirstBusinessGuard já
   * permite acesso direto quando isPlatformAdmin é true. */
  const userRecord = db.users.find((u) => u.id === userId)
  const isPlatformAdmin = userRecord?.email === 'admin@agendaqui.app' || userRecord?.email === 'admin.agendaqui@agendaqui.com'

  return {
    user: { id: userId },
    availableModes: isPlatformAdmin ? [] : availableModes,
    businesses: isPlatformAdmin ? [] : businesses,
    /* O contrato congelado de /me/session usa `customerProfile: { id }`, e o
     * `id` do perfil é o `userId` (o modelo não tem coluna `id`). */
    customerProfile: isPlatformAdmin || !customerProfile ? null : { id: customerProfile.userId },
    isPlatformAdmin,
    preferences: prefs,
  }
}

function withBusinessRelations(businessId: string) {
  const db = getDb()
  const business = db.businesses.find((b) => b.id === businessId || b.slug === businessId)
  if (!business) return null
  return {
    ...business,
    locations: db.locations.filter((l) => l.businessId === business.id),
  }
}

function serializeAppointment(raw: MockAppointment) {
  const db = getDb()
  const service = raw.service || db.services.find((s) => s.id === raw.serviceId) || null
  const employeeMembership =
    raw.employeeMembership ||
    db.memberships.find((m) => m.id === raw.employeeMembershipId) ||
    null
  return {
    id: raw.id,
    appointmentId: raw.appointmentId || raw.id,
    businessId: raw.businessId,
    locationId: raw.locationId,
    serviceId: raw.serviceId,
    customerUserId: raw.customerUserId,
    employeeMembershipId: raw.employeeMembershipId,
    status: raw.status,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    priceCents: raw.priceCents,
    cancellationReason: raw.cancellationReason,
    service: service
      ? {
          id: service.id,
          name: service.name,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
        }
      : undefined,
    employeeMembership,
    customer: raw.customer,
    createdAt: raw.createdAt,
  }
}

function capitalize(value: string): string {
  return value
    .split(/[^a-zA-ZÀ-ÖØ-öø-ÿ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function ok(body: unknown = { success: true }): MockResponse {
  return { status: 200, body }
}

function paginated<T>(data: T[], limitStr?: string, offsetStr?: string): MockResponse {
  const total = data.length
  const limit = limitStr ? Math.max(1, Number(limitStr)) : 100
  const offset = offsetStr ? Math.max(0, Number(offsetStr)) : 0
  return { status: 200, body: { data: data.slice(offset, offset + limit), total, limit, offset } }
}

export function handleRequest(
  method: Method,
  pathname: string,
  query: URLSearchParams,
  body: any
): MockResponse {
  const cleaned = pathname.replace(/^\/+/, '')
  const cleanPath = cleaned.startsWith('agendaqui-api')
    ? cleaned.slice('agendaqui-api'.length)
    : cleaned
  const segs = cleanPath.split('/').filter(Boolean).map(decodeURIComponent)

  if (segs.length === 0) {
    return ok()
  }

  const db = getDb()

    /* ---------------- auth ---------------- */
    if (segs[0] === 'auth') {
      return handleAuth(method, segs, body)
    }

    /* -------- CONTRACT FREEZE: GET /me/session (docs/CONTRACT-me-session.md) -------- */
    if (segs[0] === 'me' && segs[1] === 'session' && method === 'get') {
      const user = currentUser()
      if (!user) throw new ApiError(401, 'Unauthorized')
      return ok(buildMeSession(db, user.id))
    }

  if (segs[0] === 'me' && segs[1] === 'pos') {
    return handleMePos(method, segs, query, body)
  }

    /* -------- CONTRACT FREEZE: PATCH /me/preferences (semântica = backend, pós P2-A/B) --------
     * undefined → preservar · valor válido → atualizar · null → limpar.
     * 400: payload inválido/enum inválido/campo desconhecido (ValidationPipe).
     * 403: mode indisponível no catálogo / business que não pertence ao usuário. */
    if (segs[0] === 'me' && segs[1] === 'preferences' && method === 'patch') {
      const user = currentUser()
      if (!user) throw new ApiError(401, 'Unauthorized')
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'payload inválido')
      }
      const allowed = ['activeMode', 'activeBusinessId']
      for (const key of Object.keys(body)) {
        if (!allowed.includes(key)) throw new ApiError(400, `campo desconhecido: ${key}`)
      }
      const session = buildMeSession(db, user.id)
      const current = db.preferences[user.id] || { activeMode: null, activeBusinessId: null }
      const next: { activeMode: SessionMode | null; activeBusinessId: string | null } = { ...current }

      if ('activeMode' in body) {
        const v = body.activeMode
        if (v === null) next.activeMode = null
        else if (!['OWNER', 'PROFESSIONAL', 'CUSTOMER'].includes(v)) throw new ApiError(400, 'activeMode inválido.')
        else if (!session.availableModes.includes(v)) throw new ApiError(403, 'Modo não disponível para o usuário.')
        else next.activeMode = v
      }
      if ('activeBusinessId' in body) {
        const v = body.activeBusinessId
        if (v === null) next.activeBusinessId = null
        else if (typeof v !== 'string') throw new ApiError(400, 'activeBusinessId inválido.')
        else if (!session.businesses.some((b) => b.id === v)) throw new ApiError(403, 'Negócio não pertence ao usuário.')
        else next.activeBusinessId = v
      }

      db.preferences[user.id] = next
      saveDb()
      return ok(next)
    }

  /* ---------------- users ---------------- */
  if (segs[0] === 'users') {
    if (method === 'post' && segs.length === 1) {
      const { name, email, phone } = body || {}
      if (!email) throw new ApiError(422, 'email é obrigatório')
      const normalized = String(email).toLowerCase()
      if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
        throw new ApiError(409, 'email already exists')
      }
      const id = nextId('u')
      const now = new Date().toISOString()
      const user = {
        id,
        name: name || 'Novo usuário',
        email: normalized,
        phone: phone || undefined,
        status: 'ACTIVE' as const,
        emailVerifiedAt: now,
        createdAt: now,
      }
      db.users.push(user)
      db.sessionUserId = id
      // paridade com o backend: register cria customerProfile (CUSTOMER mode)
      db.customerProfiles.push({ userId: id, reputation: 0, strikeCount: 0 })
      saveDb()
      return ok(user)
    }
    if (method === 'patch' && segs[1] === 'me') {
      const user = currentUser()
      if (!user) throw new ApiError(401, 'Unauthorized')
      if (body?.name !== undefined) user.name = body.name
      if (body?.phone !== undefined) user.phone = body.phone
      saveDb()
      return ok(user)
    }
    if (method === 'get' && segs.length === 2) {
      const user = db.users.find((u) => u.id === segs[1])
      if (!user) throw new ApiError(404, 'Usuário não encontrado')
      return ok(user)
    }
  }

  /* ---------------- categories ---------------- */
  if (segs[0] === 'categories' && method === 'get') {
    return ok(db.categories)
  }
  if (segs[0] === 'categories' && method === 'post') {
    const category = {
      id: nextId('cat'),
      name: body?.name || 'Nova categoria',
      slug: body?.slug || slugify(body?.name || 'nova-categoria'),
      parentId: body?.parentId ?? null,
    }
    db.categories.push(category)
    saveDb()
    return ok(category)
  }
  if (segs[0] === 'categories' && method === 'delete') {
    db.categories = db.categories.filter((c) => c.id !== segs[1])
    saveDb()
    return ok()
  }

  if (segs[0] === 'categories' && method === 'get') {
    return ok(db.categories)
  }
  if (segs[0] === 'categories' && method === 'post') {
    const category = {
      id: nextId('cat'),
      name: body?.name || 'Nova categoria',
      slug: body?.slug || slugify(body?.name || 'nova-categoria'),
      parentId: body?.parentId ?? null,
    }
    db.categories.push(category)
    saveDb()
    return ok(category)
  }
  if (segs[0] === 'categories' && method === 'delete') {
    db.categories = db.categories.filter((c) => c.id !== segs[1])
    saveDb()
    return ok()
  }

  /* ---------------- businesses ---------------- */
  if (segs[0] === 'businesses') {
    return handleBusinesses(method, segs, query, body)
  }

  /* ---------------- locations ---------------- */
  if (segs[0] === 'locations') {
    return handleLocations(method, segs, body, query)
  }

  /* ---------------- employees ---------------- */
  if (segs[0] === 'employees') {
    return handleEmployees(method, segs, body)
  }

  /* ---------------- time-offs ---------------- */
  if (segs[0] === 'time-offs') {
    return handleTimeOffs(method, segs)
  }

  /* ---------------- holidays ---------------- */
  if (segs[0] === 'holidays') {
    return ok()
  }

  /* ---------------- services ---------------- */
  if (segs[0] === 'services') {
    return handleServices(method, segs, query, body)
  }

  /* ---------------- appointments ---------------- */
  if (segs[0] === 'appointments') {
    return handleAppointments(method, segs, body)
  }

  /* ---------------- me ---------------- */
  if (segs[0] === 'me') {
    if (segs[1] === 'business-verification') {
      return handleBusinessVerification(method, segs.slice(2), body)
    }
    if (segs[1] === 'appointments' && method === 'get') {
      const list = [...db.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      return paginated(
        list.map(serializeAppointment),
        query.get('limit') ?? undefined,
        query.get('offset') ?? undefined
      )
    }
    if (segs[1] === 'agenda' && method === 'get') {
      const businessId = query.get('businessId')
      const userId = currentUser()?.id
      if (!businessId || !userId) throw new ApiError(400, 'businessId é obrigatório')

      const membershipIds = new Set(
        db.memberships
          .filter(
            (membership) =>
              membership.userId === userId &&
              membership.businessId === businessId &&
              membership.role === 'EMPLOYEE' &&
              membership.active
          )
          .map((membership) => membership.id)
      )
      if (membershipIds.size === 0) throw new ApiError(403, 'Acesso negado')

      const dateFrom = query.get('dateFrom')
      const dateTo = query.get('dateTo')
      if (!dateFrom || !dateTo) throw new ApiError(400, 'dateFrom e dateTo são obrigatórios')
      const from = new Date(dateFrom).getTime()
      const to = new Date(dateTo).getTime()
      if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        throw new ApiError(400, 'Intervalo de datas inválido')
      }

      const limit = Math.min(Math.max(Number(query.get('limit')) || 100, 1), 100)
      const appointments = db.appointments
        .filter((appointment) => {
          const startsAt = new Date(appointment.startsAt).getTime()
          return (
            appointment.businessId === businessId &&
            !!appointment.employeeMembershipId &&
            membershipIds.has(appointment.employeeMembershipId) &&
            startsAt >= from &&
            startsAt <= to
          )
        })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, limit)
        .map((appointment) => ({
          ...serializeAppointment(appointment),
          location: db.locations.find((location) => location.id === appointment.locationId) ?? null,
        }))

      return ok(appointments)
    }
    if (segs[1] === 'customer-profile') {
      /* Contrato congelado: o `CustomerProfile` tem PK `userId` (não existe
       * coluna `id`), então o perfil é identificado pelo `userId`. */
      const userId = currentUser()?.id || ''
      const profile = getDb().customerProfiles.find((p) => p.userId === userId)
      return ok({
        userId,
        reputation: profile?.reputation ?? 0,
        strikeCount: profile?.strikeCount ?? 0,
      })
    }
    if (segs[1] === 'admin-profile') {
      return ok({ userId: currentUser()?.id || '', level: 'ADMIN' })
    }
  }

  /* ---------------- platform-config ---------------- */
  if (segs[0] === 'platform-config' && method === 'get') {
    return ok({ commissionRateBps: 200 })
  }

  if (segs[0] === 'platform-config' && method === 'put') {
    return ok({ commissionRateBps: body?.commissionRateBps ?? 200 })
  }

  /* ---------------- admin business-verifications ---------------- */
  if (segs[0] === 'me' && segs[1] === 'admin' && segs[2] === 'business-verifications') {
    const allV = getDb().businessVerifications
    const statusFilter = query.get('status')
    let list = [...allV].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (statusFilter) {
      list = list.filter((v) => v.status === statusFilter)
    }

    const limitRaw = query.get('limit')
    const offsetRaw = query.get('offset')
    const limit = limitRaw ? Math.max(1, Number(limitRaw)) : 20
    const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : 0
    const page = list.slice(offset, offset + limit)

    const summaries = page.map((v) => ({
      verificationId: v.id,
      ownerUserId: v.ownerUserId,
      ownerName: v.ownerUserId,
      status: v.status,
      businessType: v.businessType,
      document: v.document,
      tradeName: v.tradeName,
      legalName: v.legalName,
      categoryId: v.categoryId,
      attemptCount: v.attemptCount,
      submittedAt: v.submittedAt,
      expiresAt: v.expiresAt,
      documents: (v.documents || []).map((d: any) => ({
        id: d.id,
        documentType: d.documentType,
        version: d.version,
        status: d.status,
        sizeBytes: d.sizeBytes || 0,
        mimeType: d.mimeType,
        createdAt: d.createdAt,
        contentUrl: `mock-doc://${d.id}`,
      })),
      approvedBusinessId: v.approvedBusinessId,
      rejectionReason: v.rejectionReason,
      rejectionComment: v.rejectionComment,
    }))

    if (segs.length === 3) {
      const body = { data: summaries, total: list.length, limit, offset, items: summaries }
      return { status: 200, body }
    }

    const detailId = segs[3]
    if (segs.length === 4 && method === 'get') {
      const v = allV.find((x) => x.id === detailId)
      if (!v) throw new ApiError(404, 'Not found')
      const sv = summaries.find((s) => s.verificationId === detailId)
      return { status: 200, body: sv ?? summaries[0] }
    }

    if (segs.length === 5) {
      const vId = segs[3]
      const action = segs[4]
      if (action === 'approve' && method === 'post') {
        const v = allV.find((x) => x.id === vId)
        if (!v) throw new ApiError(404, 'Not found')
        if (v.status !== 'PENDING') throw new ApiError(409, 'Not pending')
        v.status = 'APPROVED'
        v.decidedAt = new Date().toISOString()
        v.approvedBusinessId = 'biz-mock-' + v.id.slice(0, 8)
        const db = getDb()
        if (!db.businesses.some((business) => business.id === v.approvedBusinessId)) {
          db.businesses.push({
            id: v.approvedBusinessId,
            ownerUserId: v.ownerUserId,
            name: v.tradeName,
            slug: `${slugify(v.tradeName)}-${v.id.slice(0, 8)}`,
            document: v.document,
            type: v.businessType,
            categoryId: v.categoryId,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          })
        }
        saveDb()
        return ok({ verificationId: v.id, businessId: v.approvedBusinessId, locationId: 'loc-mock-1' })
      }
      if (action === 'reject' && method === 'post') {
        const v = allV.find((x) => x.id === vId)
        if (!v) throw new ApiError(404, 'Not found')
        if (v.status !== 'PENDING') throw new ApiError(409, 'Not pending')
        v.status = 'REJECTED'
        v.rejectionReason = body?.reason || 'OUTRO'
        v.rejectionComment = body?.comment || ''
        v.decidedAt = new Date().toISOString()
        saveDb()
        return ok({ verificationId: v.id, status: 'REJECTED' })
      }
      if (action === 'request-resend' && method === 'post') {
        const v = allV.find((x) => x.id === vId)
        if (!v) throw new ApiError(404, 'Not found')
        if (v.attemptCount >= 3) throw new ApiError(409, 'Max attempts')
        v.status = 'DRAFT'
        v.submittedAt = null
        saveDb()
        return ok({ verificationId: v.id, status: 'DRAFT' })
      }
      if (action === 'block' && method === 'post') {
        const v = allV.find((x) => x.id === vId)
        if (!v) throw new ApiError(404, 'Not found')
        if (v.status !== 'APPROVED') throw new ApiError(409, 'Not approved')
        const business = getDb().businesses.find((item) => item.id === v.approvedBusinessId)
        if (!business) throw new ApiError(404, 'Approved business not found')
        if (business.status === 'BLOCKED') throw new ApiError(409, 'Business already blocked')
        business.status = 'BLOCKED'
        saveDb()
        return ok({ businessId: v.approvedBusinessId || 'biz-mock', status: 'BLOCKED' })
      }
      if (action === 'unblock' && method === 'post') {
        const v = allV.find((x) => x.id === vId)
        if (!v) throw new ApiError(404, 'Not found')
        if (v.status !== 'APPROVED') throw new ApiError(409, 'Not approved')
        const business = getDb().businesses.find((item) => item.id === v.approvedBusinessId)
        if (!business || business.status !== 'BLOCKED') throw new ApiError(409, 'Business not blocked')
        business.status = 'ACTIVE'
        saveDb()
        return ok({ businessId: v.approvedBusinessId || 'biz-mock', status: 'ACTIVE' })
      }
    }
  }

  throw new ApiError(404, 'Rota não encontrada no mock')
}

/* ---------------- business-verification (paridade mínima com o backend) ----------------
 *
 * Motivo: o primeiro acesso pede `me/business-verification` (fechamento do P-4).
 * SEM este handler o mock devolvia 404 e o `WorkspaceGate` usava `availableModes=[]`
 * (sem customerProfile no register) para mostrar o seletor de modo no lugar do
 * onboarding. Validações de domínio espelham as regras críticas do backend:
 * CNPJ 14 dígitos / CPF 11 dígitos;
 * requeridos: COMPANY → COMPROVANTE_CNPJ; INDIVIDUAL → CPF_FRENTE/CPF_VERSO.
 * O upload real (PUT) é interceptado em RAM por `mockUploadStore` (ver index.ts);
 * o complete confere a presença do objeto e NÃO recalcula sha256 (simplificação
 * documentada: no backend o hash é validado; aqui interessa o fluxo de UX).
 */

export const mockUploadStore = new Map<string, { sizeBytes: number; contentType: string }>()

const MOCK_MAX_ATTEMPTS = 3
const MOCK_PRESIGN_TTL_SECONDS = 60
const MOCK_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MOCK_SIZE_LIMITS: Record<string, number> = {
  CPF_FRENTE: 10 * 1024 * 1024,
  CPF_VERSO: 10 * 1024 * 1024,
  CPF_SELFIE: 10 * 1024 * 1024,
  COMPROVANTE_CNPJ: 15 * 1024 * 1024,
}
const MOCK_REQUIRED_DOCS: Record<string, string[]> = {
  COMPANY: ['COMPROVANTE_CNPJ'],
  INDIVIDUAL: ['CPF_FRENTE', 'CPF_VERSO'],
}
const MOCK_ALLOWED_DOCS: Record<string, string[]> = {
  COMPANY: ['COMPROVANTE_CNPJ'],
  INDIVIDUAL: ['CPF_FRENTE', 'CPF_VERSO', 'CPF_SELFIE'],
}

function mockDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

function mockCnpj(value: unknown): string {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function latestVerification(userId: string) {
  const db = getDb()
  return (
    db.businessVerifications
      .filter((v) => v.ownerUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  )
}

function serializeVerification(v: MockBusinessVerification | null) {
  if (!v) {
    return {
      verificationId: null,
      status: null,
      businessType: null,
      document: null,
      tradeName: null,
      legalName: null,
      responsibleName: null,
      responsibleCpf: null,
      categoryId: null,
      phone: null,
      timezone: null,
      attendanceType: null,
      address: null,
      latitude: null,
      longitude: null,
      attemptCount: 0,
      maxAttempts: MOCK_MAX_ATTEMPTS,
      canResubmit: false,
      requiredDocumentTypes: [],
      submittedDocumentTypes: [],
      missingDocumentTypes: [],
      submittedAt: null,
      decidedAt: null,
      expiresAt: null,
      rejectionReason: null,
      rejectionComment: null,
      approvedBusinessId: null,
    }
  }
  const submitted = v.documents.filter((d) => d.status === 'ACTIVE').map((d) => d.documentType)
  const missing = v.requiredDocumentTypes.filter((t) => !submitted.includes(t))
  return {
    verificationId: v.id,
    status: v.status,
    businessType: v.businessType,
    document: v.document,
    tradeName: v.tradeName,
    legalName: v.legalName,
    responsibleName: v.responsibleName,
    responsibleCpf: v.responsibleCpf,
    categoryId: v.categoryId,
    phone: v.phone,
    timezone: v.timezone,
    attendanceType: v.attendanceType,
    address: null,
    latitude: null,
    longitude: null,
    attemptCount: v.attemptCount,
    maxAttempts: v.maxAttempts,
    canResubmit: v.attemptCount < v.maxAttempts,
    requiredDocumentTypes: v.requiredDocumentTypes,
    submittedDocumentTypes: submitted,
    missingDocumentTypes: missing,
    submittedAt: v.submittedAt,
    decidedAt: v.decidedAt,
    expiresAt: v.expiresAt,
    rejectionReason: v.rejectionReason,
    rejectionComment: v.rejectionComment,
    approvedBusinessId: v.approvedBusinessId,
  }
}

function assertVerificationDocRules(payload: { businessType?: unknown; document?: unknown }) {
  const businessType = String(payload.businessType ?? '')
  if (businessType === 'COMPANY') {
    if (!isValidCnpj(mockCnpj(payload.document))) {
      throw new ApiError(400, 'CNPJ deve ter 14 caracteres alfanuméricos (os dois últimos são dígitos).')
    }
    return
  }
  if (businessType !== 'INDIVIDUAL' || !isValidCpf(mockDigits(payload.document)) || /[A-Za-z]/.test(String(payload.document ?? ''))) {
    throw new ApiError(400, 'CPF deve ter 11 dígitos.')
  }
}

function handleBusinessVerification(method: Method, segs: string[], body: any): MockResponse {
  const db = getDb()
  const user = currentUser()
  if (!user) throw new ApiError(401, 'Unauthorized')

  /** Solicitação "aberta" = em preenchimento/análise (paridade com findOpenByOwner: DRAFT/PENDING). */
  const open = () => {
    const v = latestVerification(user.id)
    return v && (v.status === 'DRAFT' || v.status === 'PENDING') ? v : null
  }

  if (segs.length === 0 && method === 'get') {
    return ok(serializeVerification(latestVerification(user.id)))
  }

  if (segs.length === 0 && method === 'post') {
    const { businessType, document: doc, tradeName, categoryId } = body || {}
    if (!businessType || !doc || !tradeName || !categoryId) {
      throw new ApiError(400, 'Dados obrigatórios ausentes.')
    }
    assertVerificationDocRules(body)
    const existing = open()
    if (existing) return ok(serializeVerification(existing))
    const now = new Date().toISOString()
    const created: MockBusinessVerification = {
      id: nextId('verif'),
      ownerUserId: user.id,
      status: 'DRAFT',
      businessType,
      document: businessType === 'COMPANY' ? mockCnpj(doc) : mockDigits(doc),
      tradeName: String(tradeName),
      legalName: body.legalName ?? null,
      responsibleName: body.responsibleName ?? null,
      responsibleCpf: businessType === 'INDIVIDUAL' ? mockDigits(doc) : null,
      categoryId: String(categoryId),
      phone: body.phone ?? null,
      timezone: body.timezone ?? null,
      attendanceType: body.attendanceType ?? null,
      attemptCount: 0,
      maxAttempts: MOCK_MAX_ATTEMPTS,
      requiredDocumentTypes: MOCK_REQUIRED_DOCS[businessType] ?? [],
      documents: [],
      submittedAt: null,
      decidedAt: null,
      expiresAt: null,
      rejectionReason: null,
      rejectionComment: null,
      approvedBusinessId: null,
      createdAt: now,
    }
    db.businessVerifications.push(created)
    saveDb()
    return ok(serializeVerification(created))
  }

  if (segs.length === 0 && method === 'patch') {
    const current = open()
    if (!current) throw new ApiError(404, 'Nenhuma solicitação em andamento.')
    if (current.status === 'PENDING') throw new ApiError(409, 'A solicitação já está em análise.')
    const merged = { ...current, ...body }
    assertVerificationDocRules({
      businessType: merged.businessType,
      document: merged.document,
    })
    Object.assign(current, {
      businessType: merged.businessType,
      document: merged.businessType === 'COMPANY' ? mockCnpj(merged.document) : mockDigits(merged.document),
      tradeName: merged.tradeName,
      legalName: merged.legalName ?? null,
      responsibleName: merged.responsibleName ?? null,
      responsibleCpf: merged.businessType === 'INDIVIDUAL' ? mockDigits(merged.document) : null,
      categoryId: merged.categoryId,
      phone: merged.phone ?? null,
      timezone: merged.timezone ?? null,
      attendanceType: merged.attendanceType ?? null,
    })
    saveDb()
    return ok(serializeVerification(current))
  }

  if (segs[0] === 'submit' && method === 'post') {
    const current = open()
    if (!current) throw new ApiError(404, 'Nenhuma solicitação em andamento.')
    if (current.status === 'PENDING') throw new ApiError(409, 'A solicitação já foi enviada.')
    if (current.attemptCount >= current.maxAttempts) {
      throw new ApiError(409, 'Limite de tentativas atingido.')
    }
    if (current.businessType === 'COMPANY' && (!current.legalName || !current.responsibleName)) {
      throw new ApiError(400, 'Campos obrigatórios ausentes: legalName, responsibleName.')
    }
    const submitted = current.documents.filter((d) => d.status === 'ACTIVE').map((d) => d.documentType)
    const missing = current.requiredDocumentTypes.filter((t) => !submitted.includes(t))
    if (missing.length > 0) {
      throw new ApiError(400, `Documentos obrigatórios ausentes: ${missing.join(', ')}.`)
    }
    current.status = 'PENDING'
    current.attemptCount += 1
    current.submittedAt = new Date().toISOString()
    saveDb()
    return ok(serializeVerification(current))
  }

  if (segs[0] === 'cancel' && method === 'post') {
    const current = open()
    if (!current) throw new ApiError(404, 'Nenhuma solicitação em andamento.')
    if (current.status === 'PENDING') throw new ApiError(409, 'A solicitação já está em análise.')
    current.status = 'CANCELLED'
    current.decidedAt = new Date().toISOString()
    saveDb()
    return ok(serializeVerification(current))
  }

  if (segs[0] === 'documents' && segs[1] === 'presign' && method === 'post') {
    const current = open()
    if (!current) throw new ApiError(404, 'Nenhuma solicitação em andamento.')
    if (current.status === 'PENDING') throw new ApiError(409, 'A solicitação já está em análise.')
    const { documentType, contentType } = body || {}
    if (!documentType || !MOCK_ALLOWED_DOCS[current.businessType]?.includes(documentType)) {
      throw new ApiError(409, `O documento ${documentType} não se aplica a uma solicitação ${current.businessType}.`)
    }
    const ext = contentType === 'application/pdf' ? 'pdf' : contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
    const key = `documents/${current.id}/${documentType}/${crypto.randomUUID()}.${ext}`
    return ok({
      documentType,
      url: `mock-upload://${key}`,
      storageKey: key,
      expiresAt: new Date(Date.now() + MOCK_PRESIGN_TTL_SECONDS * 1000).toISOString(),
      maxSizeBytes: MOCK_SIZE_LIMITS[documentType] ?? MOCK_SIZE_LIMITS.COMPROVANTE_CNPJ,
      allowedContentTypes: [...MOCK_ALLOWED_MIME],
    })
  }

  if (segs[0] === 'documents' && segs[1] === 'complete' && method === 'post') {
    const current = open()
    if (!current) throw new ApiError(404, 'Nenhuma solicitação em andamento.')
    if (current.status === 'PENDING') throw new ApiError(409, 'A solicitação já está em análise.')
    const { documentType, storageKey, sha256 } = body || {}
    if (!documentType || !storageKey || !sha256) throw new ApiError(400, 'documentType, storageKey e sha256 são obrigatórios.')
    const expectedPrefix = `documents/${current.id}/${documentType}/`
    if (!String(storageKey).startsWith(expectedPrefix)) {
      throw new ApiError(409, 'A chave do objeto não pertence a esta solicitação.')
    }
    const stored = mockUploadStore.get(String(storageKey))
    if (!stored) {
      throw new ApiError(404, 'Objeto não encontrado no storage. Faça o upload antes de concluir.')
    }
    for (const doc of current.documents.filter((d) => d.documentType === documentType && d.status === 'ACTIVE')) {
      doc.status = 'SUPERSEDED'
    }
    const version = current.documents.filter((d) => d.documentType === documentType).length + 1
    const created: MockVerificationDocument = {
      id: nextId('docv'),
      documentType: String(documentType),
      version,
      status: 'ACTIVE',
      sizeBytes: stored.sizeBytes,
      mimeType: stored.contentType,
      storageKey: String(storageKey),
      createdAt: new Date().toISOString(),
    }
    current.documents.push(created)
    saveDb()
    return ok({ documentId: created.id, version: created.version })
  }

  throw new ApiError(404, 'Rota não encontrada no mock')
}


/* ------------------------------------------------ */
function handleAuth(method: Method, segs: string[], body: any): MockResponse {
  const db = getDb()

  if (segs[1] === 'login' && method === 'post') {
    const email = String(body?.email || '').toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) throw new ApiError(422, 'email e senha são obrigatórios')
    let user = db.users.find((u) => u.email.toLowerCase() === email)
    if (!user) {
      const id = nextId('u')
      const now = new Date().toISOString()
      user = {
        id,
        name: capitalize(email.split('@')[0]),
        email,
        status: 'ACTIVE',
        emailVerifiedAt: now,
        createdAt: now,
      }
      db.users.push(user)
      // paridade com o backend (prisma-user.repository): register cria customerProfile
      db.customerProfiles.push({ userId: id, reputation: 0, strikeCount: 0 })
    }
    user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString()
    user.status = 'ACTIVE'
    db.sessionUserId = user.id
    saveDb()
    return ok({
      accessToken: `mock-user-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      /* O backend real devolve SOMENTE os tokens — o perfil vem de
       * `GET /auth/me`. O front já foi ajustado para esse contrato. */
    })
  }

  if (segs[1] === 'refresh-token' && method === 'post') {
    const refreshToken = body?.refreshToken || ''
    const id = refreshToken.startsWith('mock-refresh-') ? refreshToken.slice('mock-refresh-'.length) : null
    const user = id ? db.users.find((u) => u.id === id) : null
    if (!user) throw new ApiError(401, 'Invalid token')
    db.sessionUserId = user.id
    saveDb()
    return ok({ accessToken: `mock-user-${user.id}`, refreshToken })
  }

  if (segs[1] === 'me' && method === 'get') {
    const user = currentUser()
    if (!user) throw new ApiError(401, 'Unauthorized')
    return ok({ ...user })
  }

  if (segs[1] === 'logout' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'logout-all' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'forgot-password' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'reset-password' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'verify-email' && method === 'post') {
    const email = String(body?.email || '').toLowerCase()
    const user = db.users.find((u) => u.email.toLowerCase() === email)
    if (user) {
      user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString()
      user.status = 'ACTIVE'
      saveDb()
    }
    return ok()
  }
  if (segs[1] === 'change-password' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'accept-invite' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'first-access' && segs[2] === 'set-password' && method === 'post') {
    return ok()
  }
  if (segs[1] === 'create-temp-session' && method === 'post') {
    /* O backend devolve o tempToken — o front precisa capturá-lo para
     * concluir o fluxo `create-temp-session → first-access/set-password`. */
    return ok({ tempToken: `mock-temp-${nextId('tmp')}` })
  }

  throw new ApiError(404, 'Rota de autenticação não encontrada no mock')
}

/* ------------------------------------------------ */
function requireMockBusinessOwner(businessId: string) {
  const db = getDb()
  const user = currentUser()
  if (!user) throw new ApiError(401, 'Unauthorized')
  const business = db.businesses.find((item) => item.id === businessId)
  if (!business) throw new ApiError(404, 'Negócio não encontrado.')
  if (business.ownerUserId !== user.id) throw new ApiError(403, 'Acesso negado.')
  return user
}

function handleMePos(method: Method, segs: string[], query: URLSearchParams, body: any): MockResponse {
  const db = getDb()
  const user = currentUser()
  if (!user) throw new ApiError(401, 'Unauthorized')

  if (segs[2] === 'catalog' && method === 'get') {
    const businessId = query.get('businessId')
    const locationId = query.get('locationId')
    const business = db.businesses.find((item) => item.id === businessId && item.sellsProducts && item.status === 'ACTIVE')
    if (!business) throw new ApiError(403, 'O PDV não está ativo para este negócio.')
    const location = db.locations.find((item) => item.id === locationId && item.businessId === business.id && item.status === 'ACTIVE')
    const membership = db.memberships.find((item) =>
      item.userId === user.id && item.locationId === locationId && item.active &&
      (item.role === 'EMPLOYEE' || item.role === 'MANAGER') &&
      (item.businessId === business.id || location?.businessId === business.id)
    )
    if (!location || !membership) throw new ApiError(403, 'Você não tem acesso ao PDV desta unidade.')
    return ok(db.products.filter((product) => product.businessId === business.id && product.active).map((product) => ({
      ...product,
      locationId: location.id,
      locationName: location.name,
      quantity: db.inventories.find((item) => item.productId === product.id && item.locationId === location.id)?.quantity ?? 0,
    })))
  }

  if (segs[2] === 'sales' && method === 'post') {
    const { businessId, locationId, items, paymentMethod } = body ?? {}
    const business = db.businesses.find((item) => item.id === businessId && item.sellsProducts && item.status === 'ACTIVE')
    const location = db.locations.find((item) => item.id === locationId && item.businessId === businessId && item.status === 'ACTIVE')
    const membership = db.memberships.find((item) =>
      item.userId === user.id && item.locationId === locationId && item.active &&
      (item.role === 'EMPLOYEE' || item.role === 'MANAGER') &&
      (item.businessId === businessId || location?.businessId === businessId)
    )
    if (!business) throw new ApiError(403, 'O PDV não está ativo para este negócio.')
    if (!location || !membership) throw new ApiError(403, 'Você não tem acesso ao PDV desta unidade.')
    if (!Array.isArray(items) || !items.length) throw new ApiError(400, 'Adicione pelo menos um produto à venda.')
    if (!['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX'].includes(paymentMethod)) throw new ApiError(400, 'Forma de pagamento inválida.')

    const quantities = new Map<string, number>()
    for (const item of items) {
      if (!Number.isSafeInteger(item?.quantity) || item.quantity <= 0) throw new ApiError(400, 'Quantidade inválida.')
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    }
    const lineItems = [...quantities].map(([productId, quantity]) => {
      const product = db.products.find((entry) => entry.id === productId && entry.businessId === businessId && entry.active)
      if (!product) throw new ApiError(404, 'Produto não encontrado ou inativo.')
      const stock = db.inventories.find((entry) => entry.productId === productId && entry.locationId === locationId)
      if (!stock || stock.quantity < quantity) throw new ApiError(409, `Estoque insuficiente para ${product.name}.`)
      return { product, stock, quantity, subtotalCents: product.priceCents * quantity }
    })
    const totalCents = lineItems.reduce((sum, item) => sum + item.subtotalCents, 0)
    if (!Number.isSafeInteger(totalCents) || totalCents <= 0) throw new ApiError(400, 'Total inválido.')

    const now = new Date().toISOString()
    const saleId = nextId('sale')
    const sale = {
      id: saleId,
      businessId,
      locationId,
      totalCents,
      paymentMethod,
      createdAt: now,
      seller: { userId: user.id, name: user.name },
      items: lineItems.map(({ product, quantity, subtotalCents }) => ({
        id: nextId('saleitem'), productId: product.id, productName: product.name,
        unitPriceCents: product.priceCents, quantity, subtotalCents,
      })),
    }
    for (const line of lineItems) {
      line.stock.quantity -= line.quantity
      line.stock.updatedAt = now
      db.inventoryMovements.push({
        id: nextId('stockmove'), productId: line.product.id, locationId,
        actorUserId: user.id, type: 'SALE', quantityDelta: -line.quantity,
        resultingQuantity: line.stock.quantity, reason: `Venda ${saleId}`,
        saleId, createdAt: now,
      })
    }
    db.sales.push(sale)
    saveDb()
    return { status: 201, body: sale }
  }

  throw new ApiError(404, 'Rota do PDV não encontrada no mock.')
}

function handleBusinesses(method: Method, segs: string[], query: URLSearchParams, body: any): MockResponse {
  const db = getDb()

  if (segs.length === 1 && method === 'get') {
    return paginated(db.businesses, query.get('limit') ?? undefined, query.get('offset') ?? undefined)
  }

  if (segs.length === 1 && method === 'post') {
    /* Paridade com o backend real: `POST /businesses` responde **410 GONE**.
     * A criação de negócios acontece exclusivamente pelo fluxo de Business
     * Verification (`POST /me/business-verification` → documentos → submit →
     * aprovação administrativa), que cria Business + Local + membership OWNER
     * de forma atômica. */
    throw new ApiError(
      410,
      'Endpoint depreciado. A criação de negócios agora ocorre via aprovação de Business Verification (POST /me/business-verification → submit → aprovação admin).'
    )
  }

  if (segs.length === 2) {
    const idOrSlug = segs[1]

    if (method === 'get') {
      const b = withBusinessRelations(idOrSlug)
      if (!b) throw new ApiError(404, 'Negócio não encontrado')
      return ok(b)
    }

    if (method === 'delete') {
      const business = db.businesses.find((x) => x.id === idOrSlug)
      if (!business) throw new ApiError(404, 'Negócio não encontrado')
      db.businesses = db.businesses.filter((x) => x.id !== business.id)
      db.locations = db.locations.filter((l) => l.businessId !== business.id)
      db.services = db.services.filter((s) => s.businessId !== business.id)
      db.memberships = db.memberships.filter((m) => m.businessId !== business.id)
      db.appointments = db.appointments.filter((a) => a.businessId !== business.id)
      saveDb()
      return ok()
    }

    if (method === 'put') {
      const business = db.businesses.find((x) => x.id === idOrSlug)
      if (!business) throw new ApiError(404, 'Negócio não encontrado')
      if (body?.name) business.name = body.name
      if (body?.description !== undefined) business.description = body.description
      if (body?.phone !== undefined) business.phone = body.phone
      if (body?.categoryId !== undefined) business.categoryId = body.categoryId
      if (typeof body?.sellsProducts === 'boolean') business.sellsProducts = body.sellsProducts
      saveDb()
      return ok(withBusinessRelations(business.id))
    }
  }

  // businesses/slug/:slug
  if (segs.length === 3 && segs[1] === 'slug' && method === 'get') {
    const b = withBusinessRelations(segs[2])
    if (!b) throw new ApiError(404, 'Negócio não encontrado')
    return ok(b)
  }

  // businesses/:id/...
  if (segs.length === 3) {
    const businessId = segs[1]
    const resource = segs[2]

    if (resource === 'products' && method === 'get') {
      requireMockBusinessOwner(businessId)
      return ok(db.products.filter((product) => product.businessId === businessId))
    }
    if (resource === 'products' && method === 'post') {
      requireMockBusinessOwner(businessId)
      const name = String(body?.name ?? '').trim()
      const priceCents = Number(body?.priceCents)
      if (!name || !Number.isSafeInteger(priceCents) || priceCents <= 0) {
        throw new ApiError(400, 'Nome e preço válido são obrigatórios.')
      }
      const sku = body?.sku ? String(body.sku).trim() : null
      if (sku && db.products.some((product) => product.businessId === businessId && product.sku === sku)) {
        throw new ApiError(409, 'Este SKU já está cadastrado.')
      }
      const now = new Date().toISOString()
      const product = {
        id: nextId('product'), businessId, name, sku,
        description: body?.description ? String(body.description).trim() : null,
        priceCents, active: true, createdAt: now, updatedAt: now,
      }
      db.products.push(product)
      saveDb()
      return { status: 201, body: product }
    }
    if (resource === 'inventory' && method === 'get') {
      requireMockBusinessOwner(businessId)
      const locationId = query.get('locationId')
      const location = db.locations.find((item) => item.id === locationId && item.businessId === businessId)
      if (!location) throw new ApiError(404, 'Unidade não encontrada neste negócio.')
      return ok(db.products.filter((product) => product.businessId === businessId).map((product) => ({
        ...product,
        locationId,
        locationName: location.name,
        quantity: db.inventories.find((item) => item.productId === product.id && item.locationId === locationId)?.quantity ?? 0,
      })))
    }
    if (resource === 'sales' && method === 'get') {
      requireMockBusinessOwner(businessId)
      let list = db.sales.filter((sale) => sale.businessId === businessId)
      const locationId = query.get('locationId')
      if (locationId) list = list.filter((sale) => sale.locationId === locationId)
      const page = Math.max(1, Number(query.get('page') || 1))
      const limit = Math.min(100, Math.max(1, Number(query.get('limit') || 20)))
      return ok({ data: list.slice((page - 1) * limit, page * limit), total: list.length })
    }

    if (resource === 'locations' && method === 'get') {
      return ok(db.locations.filter((l) => l.businessId === businessId))
    }
    if (resource === 'locations' && method === 'post') {
      const { name, address, timezone, latitude, longitude, attendanceType, phone } = body || {}
      if (!name) throw new ApiError(422, 'name é obrigatório')
      const location = {
        id: nextId('loc'),
        businessId,
        name,
        address: address || '',
        timezone: timezone || 'America/Sao_Paulo',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        attendanceType: attendanceType || 'AT_LOCATION',
        phone: phone ?? null,
        status: 'ACTIVE' as const,
      }
      db.locations.push(location)
      saveDb()
      return { status: 201, body: location }
    }

    if (resource === 'services' && method === 'get') {
      const list = db.services.filter((s) => s.businessId === businessId)
      /* O backend pagina estas listas: paginamos quando o caller envia
       * qualquer parâmetro de paginação. */
      if (
        query.get('page') !== null ||
        query.get('limit') !== null ||
        query.get('offset') !== null
      ) {
        return paginated(list, query.get('limit') ?? undefined, query.get('offset') ?? undefined)
      }
      return ok(list)
    }
    if (resource === 'services' && method === 'post') {
      const service = handleCreateService(businessId, body)
      return { status: 201, body: service }
    }

    if (resource === 'professionals' && method === 'get') {
      /* Profissionais do negócio com os serviços vinculados de cada um.
       * É a fonte de verdade do vínculo profissional↔serviço. */
      const businessLocations = db.locations
        .filter((l) => l.businessId === businessId)
        .map((l) => l.id)
      const members = db.memberships.filter(
        (m) => m.businessId === businessId || businessLocations.includes(m.locationId)
      )
      const professionals = members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user?.name ?? '',
        position: m.position,
        role: m.role,
        active: m.active,
        services: db.services
          .filter((s) => s.businessId === businessId && s.membershipIds?.includes(m.id))
          .map((s) => ({ serviceId: s.id })),
      }))
      return paginated(
        professionals,
        query.get('limit') ?? undefined,
        query.get('offset') ?? undefined
      )
    }

    if (resource === 'employees' && method === 'get') {
      const businessExists = db.businesses.some(
        (b) => b.id === businessId || b.slug === businessId,
      )
      if (!businessExists) throw new ApiError(404, 'Negócio não encontrado')
      const businessLocations = db.locations.filter((l) => l.businessId === businessId).map((l) => l.id)
      const members = db.memberships.filter(
        (m) => m.businessId === businessId || businessLocations.includes(m.locationId)
      )
      return ok(members.map(fromMembership))
    }

    if (resource === 'invites' && method === 'post') {
      const { email, locationId, role, position } = body || {}
      if (!email) throw new ApiError(422, 'email é obrigatório')
      const normalized = String(email).toLowerCase()
      const userId = nextId('u')
      const now = new Date().toISOString()
      const user = {
        id: userId,
        name: capitalize(normalized.split('@')[0]),
        email: normalized,
        phone: undefined,
        status: 'ACTIVE' as const,
        emailVerifiedAt: null,
        createdAt: now,
      }
      const membership: MockMembership = {
        id: nextId('mem'),
        userId,
        businessId,
        locationId: locationId || db.locations.find((l) => l.businessId === businessId)?.id || '',
        role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
        position: position || 'Funcionário',
        active: true,
        user,
      }
      db.users.push(user)
      db.memberships.push(membership)
      saveDb()
      /* O backend real devolve `{ inviteId }`: a solicitação de vínculo fica
       * pendente até o aceite do convite pelo convidado. */
      return { status: 201, body: { inviteId: nextId('inv') } }
    }

    if (resource === 'appointments' && method === 'get') {
      const status = query.get('status')
      const fromKey = query.get('dateFrom') ? toDateKey(query.get('dateFrom')!) : null
      const toKey = query.get('dateTo') ? toDateKey(query.get('dateTo')!) : null
      let list = db.appointments.filter((a) => a.businessId === businessId)
      if (status) list = list.filter((a) => a.status === status)
      if (fromKey && toKey) {
        list = list.filter((a) => {
          const key = toDateKey(a.startsAt)
          return key >= fromKey && key <= toKey
        })
      }
      list = [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      return paginated(
        list.map(serializeAppointment),
        query.get('limit') ?? undefined,
        query.get('offset') ?? undefined
      )
    }
    if (resource === 'appointments' && method === 'post') {
      const appointment = handleCreateAppointment(businessId, body)
      return { status: 201, body: appointment }
    }

    if (resource === 'slots' && method === 'get') {
      return ok(handleSlots(businessId, query))
    }
  }

  if (segs.length === 4 && segs[2] === 'products' && method === 'patch') {
    const businessId = segs[1]
    requireMockBusinessOwner(businessId)
    const product = db.products.find((item) => item.id === segs[3] && item.businessId === businessId)
    if (!product) throw new ApiError(404, 'Produto não encontrado.')
    if (body?.sku && db.products.some((item) => item.id !== product.id && item.businessId === businessId && item.sku === body.sku)) {
      throw new ApiError(409, 'Este SKU já está cadastrado.')
    }
    if (body?.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) throw new ApiError(400, 'Nome do produto é obrigatório.')
      product.name = name
    }
    if (body?.sku !== undefined) product.sku = String(body.sku).trim() || null
    if (body?.description !== undefined) product.description = String(body.description).trim() || null
    if (body?.priceCents !== undefined) {
      if (!Number.isSafeInteger(body.priceCents) || body.priceCents <= 0) throw new ApiError(400, 'Preço inválido.')
      product.priceCents = body.priceCents
    }
    if (body?.active !== undefined) product.active = Boolean(body.active)
    product.updatedAt = new Date().toISOString()
    saveDb()
    return ok(product)
  }

  if (segs.length === 4 && segs[2] === 'inventory' && segs[3] === 'movements' && method === 'post') {
    const businessId = segs[1]
    const actor = requireMockBusinessOwner(businessId)
    const { productId, locationId, type, quantityDelta, reason } = body ?? {}
    const product = db.products.find((item) => item.id === productId && item.businessId === businessId)
    const location = db.locations.find((item) => item.id === locationId && item.businessId === businessId)
    if (!product || !location) throw new ApiError(404, 'Produto ou unidade não encontrado neste negócio.')
    if (!['STOCK_IN', 'ADJUSTMENT'].includes(type) || !Number.isSafeInteger(quantityDelta) || quantityDelta === 0 || !String(reason ?? '').trim()) {
      throw new ApiError(400, 'Movimentação de estoque inválida.')
    }
    if (type === 'STOCK_IN' && quantityDelta < 0) throw new ApiError(400, 'Entrada deve ser positiva.')
    const current = db.inventories.find((item) => item.productId === productId && item.locationId === locationId)
    const quantity = (current?.quantity ?? 0) + quantityDelta
    if (quantity < 0) throw new ApiError(409, 'Estoque insuficiente para esse ajuste.')
    const now = new Date().toISOString()
    if (current) { current.quantity = quantity; current.updatedAt = now }
    else db.inventories.push({ productId, locationId, quantity, updatedAt: now })
    db.inventoryMovements.push({
      id: nextId('stockmove'), productId, locationId, actorUserId: actor.id,
      type, quantityDelta, resultingQuantity: quantity, reason: String(reason).trim(), saleId: null, createdAt: now,
    })
    saveDb()
    return ok({ ...product, locationId, locationName: location.name, quantity })
  }

  throw new ApiError(404, 'Rota de negócios não encontrada no mock')
}

function fromMembership(m: MockMembership) {
  return {
    id: m.id,
    userId: m.userId,
    locationId: m.locationId,
    role: m.role,
    position: m.position,
    active: m.active,
    user: m.user,
    workingHours: m.workingHours,
  }
}

/* ------------------------------------------------ */
function handleLocations(
  method: Method,
  segs: string[],
  body: any,
  query: URLSearchParams
): MockResponse {
  const db = getDb()
  /* Rota do dono: GET /locations/business/:businessId/locations
   * (o backend indexa a listagem de locais do negócio por businessId aqui;
   * a rota `businesses/:slug/locations` é a visão pública por slug). */
  if (
    method === 'get' &&
    segs.length === 4 &&
    segs[1] === 'business' &&
    segs[3] === 'locations'
  ) {
    const businessId = segs[2]
    const list = db.locations.filter((l) => l.businessId === businessId)
    return paginated(list, query.get('limit') ?? undefined, query.get('offset') ?? undefined)
  }
  if (method === 'delete' && segs.length === 2) {
    db.locations = db.locations.filter((l) => l.id !== segs[1])
    db.memberships = db.memberships.filter((m) => m.locationId !== segs[1])
    saveDb()
    return ok()
  }
  if (method === 'put' && segs.length === 2) {
    const location = db.locations.find((l) => l.id === segs[1])
    if (!location) throw new ApiError(404, 'Local não encontrado')
    if (body?.name) location.name = body.name
    if (body?.address !== undefined) location.address = body.address
    if (body?.phone !== undefined) location.phone = body.phone ?? null
    saveDb()
    return ok(location)
  }
  if (method === 'get' && segs[2] === 'employees') {
    return ok(db.memberships.filter((m) => m.locationId === segs[1]).map(fromMembership))
  }
  if (method === 'post' && segs[2] === 'employees') {
    const location = db.locations.find((l) => l.id === segs[1])
    if (!location) throw new ApiError(404, 'Local não encontrado')
    const userId = body?.userId || nextId('u')
    const membership: MockMembership = {
      id: nextId('mem'),
      userId,
      businessId: location.businessId,
      locationId: location.id,
      role: body?.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
      position: body?.position || 'Funcionário',
      active: true,
      user: db.users.find((u) => u.id === userId),
    }
    db.memberships.push(membership)
    saveDb()
    return { status: 201, body: fromMembership(membership) }
  }
  if (method === 'post' && segs[2] === 'holidays') {
    return { status: 201, body: { id: nextId('hol'), locationId: segs[1], date: body?.date, name: body?.name } }
  }
  throw new ApiError(404, 'Rota de locais não encontrada no mock')
}

/* ------------------------------------------------ */
function handleEmployees(method: Method, segs: string[], body: any): MockResponse {
  const db = getDb()
  if (method === 'delete' && segs.length === 2) {
    db.memberships = db.memberships.filter((m) => m.id !== segs[1])
    saveDb()
    return ok()
  }
  if (method === 'put' && segs.length === 2) {
    const member = db.memberships.find((m) => m.id === segs[1])
    if (!member) throw new ApiError(404, 'Funcionário não encontrado')
    if (body?.position !== undefined) member.position = body.position
    if (body?.active !== undefined) member.active = Boolean(body.active)
    if (body?.role === 'OWNER' || body?.role === 'MANAGER' || body?.role === 'EMPLOYEE') {
      member.role = body.role
    }
    saveDb()
    return ok(fromMembership(member))
  }
  if (method === 'put' && segs[2] === 'working-hours') {
    const member = db.memberships.find((m) => m.id === segs[1])
    if (!member) throw new ApiError(404, 'Funcionário não encontrado')
    member.workingHours = Array.isArray(body?.entries) ? body.entries : undefined
    saveDb()
    return ok(fromMembership(member))
  }
  if (method === 'post' && segs[2] === 'time-offs') {
    /* O enum real do backend é REQUESTED | APPROVED | REJECTED. */
    return {
      status: 201,
      body: {
        id: nextId('to'),
        timeOffId: nextId('to'),
        employeeMembershipId: segs[1],
        ...body,
        status: 'REQUESTED',
      },
    }
  }
  throw new ApiError(404, 'Rota de funcionários não encontrada no mock')
}

/* ------------------------------------------------ */
function handleServices(method: Method, segs: string[], query: URLSearchParams, body: any): MockResponse {
  const db = getDb()
  if (method === 'delete' && segs.length === 2) {
    db.services = db.services.filter((s) => s.id !== segs[1])
    saveDb()
    return ok()
  }
  if (method === 'put' && segs.length === 2) {
    const service = db.services.find((s) => s.id === segs[1])
    if (!service) throw new ApiError(404, 'Serviço não encontrado')
    if (body?.name) service.name = body.name
    if (body?.priceCents !== undefined) service.priceCents = body.priceCents
    if (body?.durationMinutes !== undefined) service.durationMinutes = body.durationMinutes
    if (body?.description !== undefined) service.description = body.description
    if (body?.active !== undefined) service.active = Boolean(body.active)
    saveDb()
    return ok(service)
  }
  if (segs[2] === 'professionals' && segs.length === 3) {
    const service = db.services.find((s) => s.id === segs[1])
    if (!service) throw new ApiError(404, 'Serviço não encontrado')
    const membershipId = query.get('employeeMembershipId')
    if (method === 'post') {
      if (!membershipId) throw new ApiError(422, 'employeeMembershipId é obrigatório')
      service.membershipIds = Array.from(new Set([...(service.membershipIds || []), membershipId]))
      saveDb()
      return ok(service)
    }
    if (method === 'delete') {
      service.membershipIds = (service.membershipIds || []).filter((id) => id !== membershipId)
      saveDb()
      return ok(service)
    }
    if (method === 'get') {
      return ok(db.memberships.filter((m) => service.membershipIds?.includes(m.id)).map(fromMembership))
    }
  }
  throw new ApiError(404, 'Rota de serviços não encontrada no mock')
}

/* ------------------------------------------------ */
function handleTimeOffs(method: Method, segs: string[]): MockResponse {
  void method
  void segs
  return ok()
}

/* ------------------------------------------------ */
function handleAppointments(method: Method, segs: string[], body: any): MockResponse {
  const db = getDb()
  if (segs.length === 2 && method === 'get') {
    const appointment = db.appointments.find((a) => a.id === segs[1] || a.appointmentId === segs[1])
    if (!appointment) throw new ApiError(404, 'Agendamento não encontrado')
    return ok(serializeAppointment(appointment))
  }
  if (segs.length === 3 && method === 'patch') {
    const action = segs[2].toUpperCase() as Uppercase<string>
    const target = segs[1]
    const appointment = db.appointments.find((a) => a.id === target || a.appointmentId === target)
    if (!appointment) throw new ApiError(404, 'Agendamento não encontrado')
    const map: Record<string, MockAppointmentStatus> = {
      CONFIRM: 'CONFIRMED',
      COMPLETE: 'COMPLETED',
      'NO-SHOW': 'NO_SHOW',
      CANCEL: 'CANCELLED',
    }
    const status = map[action]
    if (status) {
      appointment.status = status
      if (status === 'CANCELLED') appointment.cancellationReason = body?.reason || 'Cancelado'
      saveDb()
    }
    return ok(serializeAppointment(appointment))
  }
  throw new ApiError(404, 'Rota de agendamentos não encontrada no mock')
}

/* ------------------------------------------------ */
function handleCreateService(businessId: string, body: any): MockService {
  const db = getDb()
  const { categoryId, name, priceCents, durationMinutes, bufferMinutes, description } = body || {}
  if (!name) throw new ApiError(422, 'name é obrigatório')
  const service: MockService = {
    id: nextId('srv'),
    businessId,
    categoryId: categoryId || '',
    name,
    priceCents: Number(priceCents) || 0,
    durationMinutes: Number(durationMinutes) || 30,
    bufferMinutes: bufferMinutes !== undefined ? Number(bufferMinutes) : 5,
    description: description || undefined,
    active: true,
  }
  db.services.push(service)
  saveDb()
  return service
}

function handleCreateAppointment(businessId: string, body: any) {
  const db = getDb()
  /* O DTO do backend NÃO aceita `clientName`/`clientPhone` e a ValidationPipe
   * global roda com `forbidNonWhitelisted` — enviar esses campos é 400. */
  if (body && ('clientName' in body || 'clientPhone' in body)) {
    throw new ApiError(400, 'propriedades clientName/clientPhone não são permitidas')
  }
  const { serviceId, locationId, startsAt, endsAt, employeeMembershipId } = body || {}
  if (!serviceId || !startsAt) throw new ApiError(422, 'serviceId e startsAt são obrigatórios')
  const service = db.services.find((s) => s.id === serviceId)
  /* O slot real tem duração `durationMinutes + bufferMinutes`. */
  const slotMinutes = (service?.durationMinutes ?? 30) + (service?.bufferMinutes ?? 0)
  const end = endsAt || new Date(new Date(startsAt).getTime() + slotMinutes * 60000).toISOString()
  const customerUserId = nextId('cust')
  const appointment: MockAppointment = {
    id: nextId('apt'),
    appointmentId: nextId('apt'),
    businessId,
    locationId: locationId || '',
    serviceId,
    customerUserId,
    employeeMembershipId: employeeMembershipId || db.memberships.find((m) => m.businessId === businessId)?.id,
    status: 'PENDING',
    startsAt,
    endsAt: end,
    priceCents: service?.priceCents,
    service,
    customer: { id: customerUserId, name: 'Cliente online', email: '', phone: undefined },
    createdAt: new Date().toISOString(),
  }
  db.appointments.push(appointment)
  saveDb()
  return serializeAppointment(appointment)
}

function handleSlots(businessId: string, query: URLSearchParams): unknown[] {
  const db = getDb()
  const serviceId = query.get('serviceId')
  const service = db.services.find((s) => s.id === serviceId)
  /* O slot real tem duração `durationMinutes + bufferMinutes`. */
  const duration = (service?.durationMinutes ?? 30) + (service?.bufferMinutes ?? 0)

  const fromKey = query.get('dateFrom') ? toDateKey(query.get('dateFrom')!) : dateOffsetKey(0)
  const toKey = query.get('dateTo') ? toDateKey(query.get('dateTo')!) : fromKey

  const activeMembers = db.memberships.filter((m) => m.businessId === businessId && m.active)
  let professionals = activeMembers
  if (service?.membershipIds?.length) {
    const assigned = activeMembers.filter((m) => service.membershipIds!.includes(m.id))
    if (assigned.length) professionals = assigned
  }
  const proPool = professionals.length ? professionals : db.memberships

  const slots: unknown[] = []
  const day = new Date(`${fromKey}T12:00:00`)
  let index = 0
  while (toDateKey(day) <= toKey) {
    for (let hour = 9; hour < 18; hour++) {
      for (const minute of [0, 30]) {
        const start = new Date(day)
        start.setHours(hour, minute, 0, 0)
        if (toDateKey(day) === dateOffsetKey(0) && start.getTime() < Date.now()) continue
        if (start.getHours() < 9) continue
        const pro = proPool[index % proPool.length]
        index++
        const startsAt = start.toISOString()
        const endsAt = new Date(start.getTime() + duration * 60000).toISOString()
        slots.push({
          /* O backend expõe as duas grafias: `startAt`/`endAt` (histórico) e
           * `startsAt`/`endsAt` (aliases consumidos pelo front). */
          startAt: startsAt,
          endAt: endsAt,
          startsAt,
          endsAt,
          professionalId: pro?.id || 'mem_1',
          employeeMembershipId: pro?.id || 'mem_1',
          professionalName: pro?.user?.name,
          employeeName: pro?.user?.name,
          position: pro?.position,
        })
      }
    }
    day.setDate(day.getDate() + 1)
  }
  return slots.sort((a: any, b: any) => a.startsAt.localeCompare(b.startsAt))
}
