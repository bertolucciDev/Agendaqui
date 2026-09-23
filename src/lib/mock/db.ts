export type MockUserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'

export interface MockUser {
  id: string
  name: string
  email: string
  phone?: string
  status: MockUserStatus
  emailVerifiedAt: string | null
  createdAt: string
}

export interface MockCategory {
  id: string
  name: string
  slug: string
  parentId?: string | null
}

export interface MockBusiness {
  id: string
  name: string
  slug: string
  document: string
  type: 'COMPANY' | 'INDIVIDUAL'
  categoryId: string
  description?: string
  phone?: string
  sellsProducts?: boolean
  cancellationPolicyHours?: number
  status?: 'ACTIVE' | 'INACTIVE'
  timezone?: string
  attendanceType?: string
  createdAt: string
}

export interface MockLocation {
  id: string
  businessId: string
  name: string
  address: string
  timezone: string
  latitude?: number | null
  longitude?: number | null
  attendanceType?: string
  phone?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  isHeadquarter?: boolean
}

export interface MockService {
  id: string
  businessId: string
  categoryId: string
  name: string
  priceCents: number
  durationMinutes: number
  bufferMinutes?: number
  description?: string
  active: boolean
  membershipIds?: string[]
}

export interface MockWorkingHoursEntry {
  dayOfWeek: string
  startMinute: number
  endMinute: number
}

export interface MockMembership {
  id: string
  userId: string
  businessId: string
  locationId: string
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE'
  position: string
  active: boolean
  user?: MockUser
  workingHours?: MockWorkingHoursEntry[]
}

export type MockAppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export interface MockAppointment {
  id: string
  appointmentId?: string
  businessId: string
  locationId: string
  serviceId: string
  clientId: string
  employeeMembershipId?: string
  status: MockAppointmentStatus
  startsAt: string
  endsAt: string
  priceCents?: number
  cancelReason?: string
  service?: Partial<MockService>
  employee?: Partial<MockMembership>
  client?: { id: string; name: string; email: string; phone?: string }
  createdAt: string
}

export interface MockDb {
  version: number
  seedDate: string
  sessionUserId?: string
  users: MockUser[]
  categories: MockCategory[]
  businesses: MockBusiness[]
  locations: MockLocation[]
  services: MockService[]
  memberships: MockMembership[]
  appointments: MockAppointment[]
  counters: Record<string, number>
}

const STORAGE_KEY = 'agendaqui:mock-db'

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dateOffsetKey(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return toDateKey(d)
}

export function at(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSeed(): MockDb {
  const now = new Date()
  const nowIso = now.toISOString()
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 86400000).toISOString()

  const users: MockUser[] = [
    {
      id: 'u_demo',
      name: 'Ana Martins',
      email: 'demo@agendaqui.app',
      phone: '(11) 99999-0001',
      status: 'ACTIVE',
      emailVerifiedAt: nowIso,
      createdAt: daysAgo(150),
    },
    {
      id: 'u_1',
      name: 'Carlos Andrade',
      email: 'carlos.andrade@barbeariaelite.com',
      phone: '(11) 98888-1101',
      status: 'ACTIVE',
      emailVerifiedAt: nowIso,
      createdAt: daysAgo(140),
    },
    {
      id: 'u_2',
      name: 'Renata Souza',
      email: 'renata.souza@barbeariaelite.com',
      phone: '(11) 98888-1102',
      status: 'ACTIVE',
      emailVerifiedAt: nowIso,
      createdAt: daysAgo(120),
    },
    {
      id: 'u_3',
      name: 'João Pedro Nascimento',
      email: 'joao.nascimento@barbeariaelite.com',
      phone: '(11) 98888-1103',
      status: 'ACTIVE',
      emailVerifiedAt: nowIso,
      createdAt: daysAgo(130),
    },
  ]

  const categories: MockCategory[] = [
    { id: 'cat_barbearia', name: 'Barbearia', slug: 'barbearia' },
    { id: 'cat_estetica', name: 'Estética', slug: 'estetica' },
    { id: 'cat_beleza', name: 'Beleza', slug: 'beleza' },
    { id: 'cat_saude', name: 'Saúde & Bem-estar', slug: 'saude-bem-estar' },
  ]

  const businesses: MockBusiness[] = [
    {
      id: 'biz_demo',
      name: 'Barbearia Elite',
      slug: 'barbearia-elite',
      document: '12345678000190',
      type: 'COMPANY',
      categoryId: 'cat_barbearia',
      description: 'Barbearia tradicional no coração de São Paulo.',
      phone: '(11) 4002-8922',
      sellsProducts: true,
      cancellationPolicyHours: 24,
      status: 'ACTIVE',
      timezone: 'America/Sao_Paulo',
      attendanceType: 'AT_LOCATION',
      createdAt: daysAgo(120),
    },
  ]

  const locations: MockLocation[] = [
    {
      id: 'loc_demo',
      businessId: 'biz_demo',
      name: 'Matriz',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      timezone: 'America/Sao_Paulo',
      latitude: -23.562973,
      longitude: -46.654392,
      attendanceType: 'AT_LOCATION',
      phone: '(11) 4002-8922',
      status: 'ACTIVE',
      isHeadquarter: true,
    },
    {
      id: 'loc_2',
      businessId: 'biz_demo',
      name: 'Unidade Vila Madalena',
      address: 'Rua Harmonia, 320 - Vila Madalena, São Paulo - SP',
      timezone: 'America/Sao_Paulo',
      latitude: -23.555594,
      longitude: -46.688735,
      attendanceType: 'AT_LOCATION',
      phone: '(11) 4002-1122',
      status: 'ACTIVE',
      isHeadquarter: false,
    },
  ]

  const services: MockService[] = [
    {
      id: 'srv_1',
      businessId: 'biz_demo',
      categoryId: 'cat_barbearia',
      name: 'Corte de cabelo',
      priceCents: 5000,
      durationMinutes: 30,
      bufferMinutes: 5,
      description: 'Corte na tesoura e máquina, finalização com pomada.',
      active: true,
      membershipIds: ['mem_1', 'mem_2'],
    },
    {
      id: 'srv_2',
      businessId: 'biz_demo',
      categoryId: 'cat_barbearia',
      name: 'Barba',
      priceCents: 3500,
      durationMinutes: 20,
      bufferMinutes: 5,
      description: 'Barba alinhada com toalha quente e balm.',
      active: true,
      membershipIds: ['mem_1'],
    },
    {
      id: 'srv_3',
      businessId: 'biz_demo',
      categoryId: 'cat_barbearia',
      name: 'Corte + Barba',
      priceCents: 7500,
      durationMinutes: 40,
      bufferMinutes: 5,
      description: 'Combo completo de corte e barba com desconto.',
      active: true,
      membershipIds: ['mem_1', 'mem_2'],
    },
    {
      id: 'srv_4',
      businessId: 'biz_demo',
      categoryId: 'cat_barbearia',
      name: 'Pigmentação de cabelo',
      priceCents: 6000,
      durationMinutes: 30,
      description: 'Disfarce de fios brancos com pigmentação natural.',
      active: true,
      membershipIds: ['mem_1'],
    },
    {
      id: 'srv_5',
      businessId: 'biz_demo',
      categoryId: 'cat_estetica',
      name: 'Hidratação capilar',
      priceCents: 8000,
      durationMinutes: 40,
      description: 'Hidratação profunda com produtos premium.',
      active: true,
      membershipIds: ['mem_2'],
    },
  ]

  const memberships: MockMembership[] = [
    {
      id: 'mem_1',
      userId: 'u_1',
      businessId: 'biz_demo',
      locationId: 'loc_demo',
      role: 'EMPLOYEE',
      position: 'Barbeiro',
      active: true,
      user: users[1],
    },
    {
      id: 'mem_2',
      userId: 'u_2',
      businessId: 'biz_demo',
      locationId: 'loc_2',
      role: 'EMPLOYEE',
      position: 'Barbeira',
      active: true,
      user: users[2],
    },
    {
      id: 'mem_3',
      userId: 'u_3',
      businessId: 'biz_demo',
      locationId: 'loc_demo',
      role: 'MANAGER',
      position: 'Gerente',
      active: true,
      user: users[3],
    },
    {
      id: 'mem_4',
      userId: 'u_demo',
      businessId: 'biz_demo',
      locationId: 'loc_demo',
      role: 'OWNER',
      position: 'Proprietária',
      active: true,
      user: users[0],
    },
  ]

  const clients: { id: string; name: string; phone: string }[] = [
    { id: 'cust_1', name: 'Marcos Paulo', phone: '(11) 97777-0101' },
    { id: 'cust_2', name: 'Beatriz Nogueira', phone: '(11) 97777-0102' },
    { id: 'cust_3', name: 'Fernanda Alves', phone: '(11) 97777-0103' },
    { id: 'cust_4', name: 'Rafael Costa', phone: '(11) 97777-0104' },
    { id: 'cust_5', name: 'Juliana Mendes', phone: '(11) 97777-0105' },
    { id: 'cust_6', name: 'Tiago Barbosa', phone: '(11) 97777-0106' },
    { id: 'cust_7', name: 'Camila Rocha', phone: '(11) 97777-0107' },
    { id: 'cust_8', name: 'Diego Ferreira', phone: '(11) 97777-0108' },
  ]

  const raw: {
    day: number
    hour: number
    minute: number
    serviceId: string
    memberId: string
    status: MockAppointmentStatus
    clientIndex: number
  }[] = [
    { day: 0, hour: 9, minute: 0, serviceId: 'srv_3', memberId: 'mem_1', status: 'CONFIRMED', clientIndex: 0 },
    { day: 0, hour: 11, minute: 0, serviceId: 'srv_1', memberId: 'mem_2', status: 'CONFIRMED', clientIndex: 1 },
    { day: 0, hour: 14, minute: 30, serviceId: 'srv_2', memberId: 'mem_3', status: 'COMPLETED', clientIndex: 2 },
    { day: 0, hour: 16, minute: 0, serviceId: 'srv_4', memberId: 'mem_1', status: 'PENDING', clientIndex: 3 },
    { day: 1, hour: 10, minute: 0, serviceId: 'srv_1', memberId: 'mem_1', status: 'CONFIRMED', clientIndex: 4 },
    { day: 1, hour: 13, minute: 0, serviceId: 'srv_3', memberId: 'mem_2', status: 'CONFIRMED', clientIndex: 5 },
    { day: 1, hour: 17, minute: 0, serviceId: 'srv_5', memberId: 'mem_3', status: 'PENDING', clientIndex: 6 },
    { day: 2, hour: 9, minute: 30, serviceId: 'srv_2', memberId: 'mem_1', status: 'CONFIRMED', clientIndex: 7 },
    { day: 2, hour: 15, minute: 0, serviceId: 'srv_1', memberId: 'mem_2', status: 'PENDING', clientIndex: 0 },
  ]

  const appointments: MockAppointment[] = raw.map((r, i) => {
    const service = services.find((s) => s.id === r.serviceId)
    const member = memberships.find((m) => m.id === r.memberId)
    const client = clients[r.clientIndex]
    const start = at(r.day, r.hour, r.minute)
    const end = new Date(new Date(start).getTime() + (service?.durationMinutes ?? 30) * 60000).toISOString()
    return {
      id: `apt_seed_${i + 1}`,
      appointmentId: `apt_seed_${i + 1}`,
      businessId: 'biz_demo',
      locationId: 'loc_demo',
      serviceId: r.serviceId,
      clientId: client.id,
      employeeMembershipId: r.memberId,
      status: r.status,
      startsAt: start,
      endsAt: end,
      priceCents: service?.priceCents,
      service,
      employee: member,
      client: { id: client.id, name: client.name, email: '', phone: client.phone },
      createdAt: daysAgo(3),
    }
  })

  return {
    version: 1,
    seedDate: toDateKey(now),
    sessionUserId: 'u_demo',
    users,
    categories,
    businesses,
    locations,
    services,
    memberships,
    appointments,
    counters: {
      biz: 1,
      loc: 3,
      mem: 4,
      u: 4,
      srv: 6,
      apt: 10,
      cust: 9,
      cat: 5,
    },
  }
}

function readLocal(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
  return null
}

function writeLocal(value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value)
    }
  } catch {
    // ignore
  }
}

let memoryDb: MockDb | null = null

export function getDb(): MockDb {
  if (memoryDb) return memoryDb
  const stored = readLocal()
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as MockDb
      if (
        parsed.seedDate === dateOffsetKey(0) &&
        Array.isArray(parsed.businesses) &&
        Array.isArray(parsed.users)
      ) {
        memoryDb = parsed
        return parsed
      }
    } catch {
      // ignore
    }
  }
  const fresh = buildSeed()
  memoryDb = fresh
  writeLocal(JSON.stringify(fresh))
  return fresh
}

export function saveDb(): void {
  if (!memoryDb) return
  writeLocal(JSON.stringify(memoryDb))
}

export function resetDb(): void {
  memoryDb = null
}

export function nextId(prefix: string): string {
  const db = getDb()
  const next = (db.counters[prefix] ?? 0) + 1
  db.counters[prefix] = next
  return `${prefix}_${next}`
}

export function slugify(value: string): string {
  if (value === 'barbearia-elite') return value
  return slugifyName(value)
}