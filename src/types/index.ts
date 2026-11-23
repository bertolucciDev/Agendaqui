export type BusinessType = 'COMPANY' | 'INDIVIDUAL'
export type AttendanceType = 'AT_LOCATION' | 'AT_CUSTOMER' | 'BOTH'
export type MembershipRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'
export type MembershipInviteRole = 'MANAGER' | 'EMPLOYEE'
export type { InventoryMovementKind, LocationInventory, PosPaymentMethod, PosProduct, PosSale, PosSaleItem, PosSalePage } from './pos'
export type DayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
export type TimeOffType = 'VACATION' | 'SICK_LEAVE' | 'ABSENCE'
export type TimeOffRequestType = 'VACATION' | 'ABSENCE'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  /** Espelha o enum UserStatus do backend: PENDING_VERIFICATION | ACTIVE | BLOCKED. */
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'BLOCKED'
  emailVerifiedAt: string | null
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * POST /auth/login devolve APENAS os tokens — o usuário NÃO vem na resposta.
 * O perfil é obtido em seguida por GET /auth/me.
 * `user` existe só no mock local (login simulado) e, por isso, é opcional.
 */
export interface LoginResponse extends AuthTokens {
  user?: User
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId?: string | null
  children?: Category[]
}

export interface Business {
  id: string
  name: string
  slug: string
  document: string
  type: BusinessType
  categoryId: string
  description?: string
  phone?: string
  sellsProducts?: boolean
  cancellationPolicyHours?: number
  status?: 'ACTIVE' | 'INACTIVE'
  locations?: BusinessLocation[]
  services?: Service[]
  createdAt: string
}

export interface BusinessLocation {
  id: string
  name: string
  address?: string
  timezone?: string
  latitude?: number | null
  longitude?: number | null
  geohash?: string | null
}

export interface Location {
  id: string
  businessId: string
  name: string
  address: string
  timezone: string
  latitude?: number | null
  longitude?: number | null
  geohash?: string | null
  attendanceType?: AttendanceType
  phone?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  isHeadquarter?: boolean
}

export interface Holiday {
  id: string
  locationId: string
  date: string
  name: string
}

export interface Service {
  id: string
  businessId: string
  categoryId: string
  name: string
  priceCents: number
  durationMinutes: number
  bufferMinutes?: number
  description?: string
  active: boolean
  /**
   * Legado do mock: o backend real NÃO devolve este campo em
   * `GET /businesses/:slug/services`. A fonte de verdade do vínculo
   * profissional↔serviço é `GET /businesses/:slug/professionals`.
   */
  membershipIds?: string[]
}

/**
 * Usuário embutido na resposta de membership (`Membership.user`).
 *
 * A listagem de equipe (`GET /businesses/:id/employees`) devolve
 * `{ id, name, email }` — os demais campos do perfil só existem em
 * `GET /auth/me`, então aqui são opcionais.
 */
export interface MembershipUser {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  status?: string
  emailVerifiedAt?: string | null
  createdAt?: string
}

/**
 * Vínculo de um usuário com um local do negócio.
 * `membershipId` é devolvido pelas mutações (create/update) junto de `id`.
 */
export interface Membership {
  id: string
  membershipId?: string
  userId: string
  locationId: string
  role: MembershipRole
  position: string
  active: boolean
  user?: MembershipUser
  workingHours?: WorkingHoursEntry[]
}

/**
 * Profissional público do negócio (`GET /businesses/:slug/professionals`).
 * `id` é o id do membership e `services` lista os serviços vinculados.
 */
export interface BusinessProfessional {
  id: string
  userId: string
  name: string
  position: string
  role: MembershipRole
  active: boolean
  services: { serviceId: string }[]
}

export interface WorkingHoursEntry {
  dayOfWeek: DayOfWeek
  startMinute: number
  endMinute: number
}

export type TimeOffStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'

export interface TimeOff {
  id: string
  employeeMembershipId: string
  type: TimeOffType
  startAt: string
  endAt: string
  reason?: string
  status: TimeOffStatus
}

/** Payload de `POST /employees/{id}/time-offs`. */
export interface TimeOffRequestResult {
  timeOffId: string
}

/** Payload de `POST /businesses/{id}/invites`. */
export interface MembershipInviteResult {
  inviteId: string
}

/**
 * Agendamento — contrato congelado com o backend (`AppointmentResponse`).
 * Um nome por conceito, e o nome é o do domínio: `customerUserId` (id do
 * `User` do cliente), `employeeMembershipId` (id do vínculo profissional↔local),
 * `cancellationReason` e as relações `customer` / `employeeMembership`.
 */
export interface Appointment {
  id: string
  businessId: string
  locationId: string
  serviceId: string
  customerUserId: string
  employeeMembershipId?: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  priceCents?: number
  cancellationReason?: string
  service?: Service
  location?: Location
  employeeMembership?: Membership
  customer?: Pick<User, 'id' | 'name' | 'email' | 'phone'>
}

export interface AvailableSlot {
  startsAt: string
  endsAt: string
  employeeMembershipId?: string
}

/**
 * GET /me/customer-profile — o backend devolve `userId` + `reputation` + `strikeCount`.
 * O modelo `CustomerProfile` tem PK `userId` (não existe coluna `id`), então o
 * identificador do perfil é o próprio `userId`.
 */
export interface CustomerProfile {
  userId: string
  reputation: number
  strikeCount: number
}

/**
 * GET /me/admin-profile — o backend devolve `userId` + `level` (enum AdminLevel).
 * O modelo `AdminProfile` tem PK `userId` (não existe coluna `id`), então o
 * identificador do perfil é o próprio `userId`.
 */
export interface AdminProfile {
  userId: string
  level: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT'
}

export interface PlatformConfig {
  commissionRateBps: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}
