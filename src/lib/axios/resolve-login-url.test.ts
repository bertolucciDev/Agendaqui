import { describe, it, expect } from 'vitest'
import { resolveLoginUrl } from './client'

/* FE-API-01 #5 — redirect 401 compatível com qualquer BASE_URL suportada. */
describe('resolveLoginUrl (redirect 401 base-agnóstico)', () => {
  it('BASE_URL=/ → /login', () => {
    expect(resolveLoginUrl('/')).toBe('/login')
  })

  it('BASE_URL=/agendaqui/ → /agendaqui/login', () => {
    expect(resolveLoginUrl('/agendaqui/')).toBe('/agendaqui/login')
  })

  it('sem trailing slash também resolve', () => {
    expect(resolveLoginUrl('/agendaqui')).toBe('/agendaqui/login')
    expect(resolveLoginUrl('')).toBe('/login')
  })

  it('default usa import.meta.env.BASE_URL', () => {
    expect(resolveLoginUrl()).toBe(`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/login`)
  })
})
