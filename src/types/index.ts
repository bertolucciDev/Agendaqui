export type BusinessType = 'COMPANY' | 'INDIVIDUAL'
export type AttendanceType = 'AT_LOCATION' | 'AT_CUSTOMER' | 'BOTH'
export type MembershipRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'
export type MembershipInviteRole = 'MANAGER' | 'EMPLOYEE'
export type DayOfWeek = 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
export type TimeOffType = 'VACATION' | 'SICK_LEAVE' | 'ABSENCE'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED'
  emailVerifiedAt: string | null
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse extends AuthTokens {
  user: User
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
  membershipIds?: string[]
}

export interface Membership {
  id: string
  userId: string
  locationId: string
  role: MembershipRole
  position: string
  active: boolean
  user?: User
  workingHours?: WorkingHoursEntry[]
}

export interface WorkingHoursEntry {
  dayOfWeek: DayOfWeek
  startMinute: number
  endMinute: number
}

export interface TimeOff {
  id: string
  employeeMembershipId: string
  type: TimeOffType
  startAt: string
  endAt: string
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export interface Appointment {
  id: string
  businessId: string
  locationId: string
  serviceId: string
  clientId: string
  employeeMembershipId?: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  priceCents?: number
  cancelReason?: string
  service?: Service
  location?: Location
  employee?: Membership
  client?: Pick<User, 'id' | 'name' | 'email' | 'phone'>
}

export interface AvailableSlot {
  startsAt: string
  endsAt: string
  employeeMembershipId?: string
}

export interface CustomerProfile {
  id: string
  userId: string
  reputation: number
  strikes: number
}

export interface AdminProfile {
  id: string
  userId: string
  role: string
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
