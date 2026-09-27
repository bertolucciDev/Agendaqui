import { describe, it, expect } from 'vitest'
import { isValidCpf, isValidCnpj, firstBusinessSchema } from './validations'

/* FE-MVP-01 — testes 5–8: CPF/CNPJ válidos/inválidos (dígitos verificadores). */
describe('isValidCpf / isValidCnpj', () => {
  it('CNPJ válido', () => {
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true)
    expect(isValidCnpj('04252011000110')).toBe(true)
  })
  it('CNPJ inválido (dígito verificador)', () => {
    expect(isValidCnpj('04.252.011/0001-11')).toBe(false)
  })
  it('CPF válido', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
  })
  it('CPF inválido (checksum e repetidos)', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })
})

describe('firstBusinessSchema', () => {
  const base = {
    categoryId: 'cat_1',
    address: 'Rua X, 10 - Centro, São Paulo - SP',
  }

  it('schema aceita COMPANY com CNPJ válido e valida obrigatórios', () => {
    const r = firstBusinessSchema.safeParse({ ...base, type: 'COMPANY', document: '04.252.011/0001-10', name: 'Spa' })
    expect(r.success).toBe(true)
  })

  it('schema rejeita CNPJ inválido em COMPANY e CPF inválido em INDIVIDUAL', () => {
    expect(
      firstBusinessSchema.safeParse({ ...base, type: 'COMPANY', document: '11.111.111/1111-11', name: 'Spa' }).success,
    ).toBe(false)
    expect(
      firstBusinessSchema.safeParse({ ...base, type: 'INDIVIDUAL', document: '123.456.789-00', name: 'Ana' }).success,
    ).toBe(false)
  })

  it('schema rejeita categoria ausente e telefone curto', () => {
    expect(
      firstBusinessSchema.safeParse({ ...base, type: 'INDIVIDUAL', document: '52998224725', name: 'Ana', categoryId: '' }).success,
    ).toBe(false)
    expect(
      firstBusinessSchema.safeParse({ ...base, type: 'INDIVIDUAL', document: '52998224725', name: 'Ana', phone: '1199' }).success,
    ).toBe(false)
  })
})
