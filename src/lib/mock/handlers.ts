import {
  getDb,
  saveDb,
  nextId,
  slugify,
  dateOffsetKey,
  type MockAppointment,
  type MockAppointmentStatus,
  type MockMembership,
  type MockService,
  type MockDb,
  type MeSessionPayload,
  type SessionMode,
} from './db'

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
  EMPLOYEE: ['appointments:write', 'appointments:read'],
}

/* Derivação congelada: OWNER/MANAGER ⇒ modo OWNER; EMPLOYEE ⇒ PROFESSIONAL; CustomerProfile ⇒ CUSTOMER */
function buildMeSession(db: MockDb, userId: string): MeSessionPayload {
  const memberships = db.memberships.filter((m) => m.userId === userId && m.active)
  const businesses = db.businesses
    .filter((b) => memberships.some((m) => m.businessId === b.id))
    .map((b) => ({
      id: b.id,
      name: b.name,
      memberships: memberships
        .filter((m) => m.businessId === b.id)
        .map((m) => ({
          id: m.id,
          role: m.role,
          // OWNER/MANAGER (gestão) enxergam todos os locais ativos do business;
          // EMPLOYEE fica restrito ao(s) local(is) da própria membership.
          locationIds:
            m.role === 'EMPLOYEE'
              ? m.locationId
                ? [m.locationId]
                : []
              : db.locations
                  .filter((l) => l.businessId === b.id && l.status === 'ACTIVE')
                  .map((l) => l.id),
          permissions: ROLE_PERMISSIONS[m.role],
          active: m.active,
        })),
    }))

  const customerProfile = db.customerProfiles.find((c) => c.userId === userId) || null

  const availableModes: SessionMode[] = []
  if (memberships.some((m) => m.role === 'OWNER' || m.role === 'MANAGER')) availableModes.push('OWNER')
  if (memberships.some((m) => m.role === 'EMPLOYEE')) availableModes.push('PROFESSIONAL')
  if (customerProfile) availableModes.push('CUSTOMER')

  const prefs = db.preferences[userId] || { activeMode: null, activeBusinessId: null }

  return {
    user: { id: userId },
    availableModes,
    businesses,
    customerProfile: customerProfile ? { id: customerProfile.id } : null,
    isPlatformAdmin: false,
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
  const employee =
    raw.employee ||
    db.memberships.find((m) => m.id === raw.employeeMembershipId) ||
    null
  return {
    id: raw.id,
    appointmentId: raw.appointmentId || raw.id,
    businessId: raw.businessId,
    locationId: raw.locationId,
    serviceId: raw.serviceId,
    clientId: raw.clientId,
    employeeMembershipId: raw.employeeMembershipId,
    status: raw.status,
    startsAt: raw.startsAt,
    endsAt: raw.endsAt,
    priceCents: raw.priceCents,
    cancelReason: raw.cancelReason,
    service: service
      ? {
          id: service.id,
          name: service.name,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
        }
      : undefined,
    employee,
    client: raw.client,
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

  /* ---------------- businesses ---------------- */
  if (segs[0] === 'businesses') {
    return handleBusinesses(method, segs, query, body)
  }

  /* ---------------- locations ---------------- */
  if (segs[0] === 'locations') {
    return handleLocations(method, segs, body)
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
    if (segs[1] === 'appointments' && method === 'get') {
      const list = [...db.appointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      return paginated(
        list.map(serializeAppointment),
        query.get('limit') ?? undefined,
        query.get('offset') ?? undefined
      )
    }
    if (segs[1] === 'customer-profile') {
      return ok({ id: 'prof_cust', userId: currentUser()?.id || '', reputation: 0, strikes: 0 })
    }
    if (segs[1] === 'admin-profile') {
      return ok({ id: 'prof_admin', userId: currentUser()?.id || '', role: 'OWNER' })
    }
  }

  /* ---------------- platform-config ---------------- */
  if (segs[0] === 'platform-config' && method === 'get') {
    return ok({ commissionRateBps: 200 })
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
    }
    user.emailVerifiedAt = user.emailVerifiedAt || new Date().toISOString()
    user.status = 'ACTIVE'
    db.sessionUserId = user.id
    saveDb()
    return ok({
      accessToken: `mock-user-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      user: { ...user },
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
    return ok()
  }

  throw new ApiError(404, 'Rota de autenticação não encontrada no mock')
}

/* ------------------------------------------------ */
function handleBusinesses(method: Method, segs: string[], query: URLSearchParams, body: any): MockResponse {
  const db = getDb()

  if (segs.length === 1 && method === 'get') {
    return paginated(db.businesses, query.get('limit') ?? undefined, query.get('offset') ?? undefined)
  }

if (segs.length === 1 && method === 'post') {
    const { name, document, type, categoryId, locationName, address, timezone, attendanceType, phone, description } = body || {}
      if (!name) throw new ApiError(422, 'name é obrigatório')
      const businessId = nextId('biz')
      const locationId = nextId('loc')
      const membershipId = nextId('mem')
      const now = new Date().toISOString()
      const business = {
        id: businessId,
        name: String(name),
        slug: slugify(String(name)),
        document: document || '',
        type: (type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY') as 'COMPANY' | 'INDIVIDUAL',
        categoryId: categoryId || '',
        description: description || undefined,
        phone: phone || undefined,
        timezone: timezone || 'America/Sao_Paulo',
        attendanceType: attendanceType || 'AT_LOCATION',
        status: 'ACTIVE' as const,
        createdAt: now,
      }
      db.businesses.push(business)
      db.locations.push({
        id: locationId,
        businessId,
        name: locationName || 'Principal',
        address: address || '',
        timezone: timezone || 'America/Sao_Paulo',
        attendanceType: attendanceType || 'AT_LOCATION',
        phone: phone || null,
        status: 'ACTIVE',
        isHeadquarter: true,
      })
      const owner = currentUser()
      db.memberships.push({
        id: membershipId,
        userId: owner?.id || 'u_demo',
        businessId,
        locationId,
        role: 'OWNER',
        position: 'Proprietário',
        active: true,
        user: owner || undefined,
      })
      saveDb()
      return {
        status: 201,
        body: {
          id: businessId,
          businessId,
          locationId,
          membershipId,
          slug: business.slug,
          name: business.name,
          createdAt: business.createdAt,
        },
      }
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
      if (query.get('page') !== null) {
        return paginated(
          db.services.filter((s) => s.businessId === businessId),
          query.get('limit') ?? undefined,
          query.get('offset') ?? undefined
        )
      }
      return ok(db.services.filter((s) => s.businessId === businessId))
    }
    if (resource === 'services' && method === 'post') {
      const service = handleCreateService(businessId, body)
      return { status: 201, body: service }
    }

    if (resource === 'employees' && method === 'get') {
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
      return { status: 201, body: fromMembership(membership) }
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
function handleLocations(method: Method, segs: string[], body: any): MockResponse {
  const db = getDb()
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
    return { status: 201, body: { id: nextId('to'), employeeMembershipId: segs[1], ...body, status: 'PENDING' } }
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
      if (status === 'CANCELLED') appointment.cancelReason = body?.reason || 'Cancelado'
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
  const { serviceId, locationId, startsAt, endsAt, employeeMembershipId, clientName, clientPhone } = body || {}
  if (!serviceId || !startsAt) throw new ApiError(422, 'serviceId e startsAt são obrigatórios')
  const service = db.services.find((s) => s.id === serviceId)
  const end = endsAt || new Date(new Date(startsAt).getTime() + (service?.durationMinutes ?? 30) * 60000).toISOString()
  const clientId = nextId('cust')
  const appointment: MockAppointment = {
    id: nextId('apt'),
    appointmentId: nextId('apt'),
    businessId,
    locationId: locationId || '',
    serviceId,
    clientId,
    employeeMembershipId: employeeMembershipId || db.memberships.find((m) => m.businessId === businessId)?.id,
    status: 'PENDING',
    startsAt,
    endsAt: end,
    priceCents: service?.priceCents,
    service,
    client: { id: clientId, name: clientName || 'Cliente online', email: '', phone: clientPhone || undefined },
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
  const duration = service?.durationMinutes ?? 30

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
        slots.push({
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + duration * 60000).toISOString(),
          employeeMembershipId: pro?.id || 'mem_1',
          employeeName: pro?.user?.name,
          position: pro?.position,
        })
      }
    }
    day.setDate(day.getDate() + 1)
  }
  return slots.sort((a: any, b: any) => a.startsAt.localeCompare(b.startsAt))
}