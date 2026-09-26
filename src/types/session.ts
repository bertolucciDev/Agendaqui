/* CONTRACT FREEZE — tipos de GET /me/session (docs/CONTRACT-me-session.md)
 * Fonte única de referência MOCK-FIRST. Mudança aqui = novo freeze. */

export type SessionMode = 'OWNER' | 'PROFESSIONAL' | 'CUSTOMER'
export type MembershipRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE'

export interface SessionMembership {
  id: string
  role: MembershipRole
  locationIds: string[]
  permissions: string[]
  active: boolean
}

export interface SessionBusiness {
  id: string
  name: string
  memberships: SessionMembership[]
}

export interface SessionPreferences {
  activeMode: SessionMode | null
  activeBusinessId: string | null
}

export interface MeSession {
  user: { id: string }
  availableModes: SessionMode[]
  businesses: SessionBusiness[]
  customerProfile: { id: string } | null
  isPlatformAdmin: boolean
  preferences: SessionPreferences
}
