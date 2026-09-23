export interface StoredBusiness {
  businessId: string
  locationId: string
  membershipId: string
  slug: string
  name: string
}

const STORAGE_KEY = 'agendaqui:businesses'
const ACTIVE_KEY = 'agendaqui:active-business'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getStoredBusinesses(): StoredBusiness[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredBusiness[]) : []
  } catch {
    return []
  }
}

export function saveStoredBusiness(business: StoredBusiness): void {
  const all = getStoredBusinesses().filter((b) => b.businessId !== business.businessId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, business]))
  if (!getActiveBusinessId()) setActiveBusinessId(business.businessId)
}

export function removeStoredBusiness(businessId: string): void {
  const all = getStoredBusinesses().filter((b) => b.businessId !== businessId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  if (getActiveBusinessId() === businessId) clearActiveBusinessId()
}

export function clearStoredBusinesses(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function getActiveBusinessId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function setActiveBusinessId(businessId: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, businessId)
  } catch {
    // ignore
  }
}

export function clearActiveBusinessId(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // ignore
  }
}

export function getActiveBusiness(): StoredBusiness | null {
  const all = getStoredBusinesses()
  if (all.length === 0) return null
  const activeId = getActiveBusinessId()
  return all.find((b) => b.businessId === activeId) || all[0]
}