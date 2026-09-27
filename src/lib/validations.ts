import { z } from 'zod'

/* ── FE-MVP-01: validação real de CPF/CNPJ (dígitos verificadores) ── */

const onlyDigits = (v: string) => v.replace(/\D/g, '')

function allSame(d: string): boolean {
  return /^(\d)\1+$/.test(d)
}

function dvDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0)
  const mod = (sum % 11)
  return mod < 2 ? 0 : 11 - mod
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11 || allSame(d)) return false
  const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [11, ...w1]
  return dvDigit(d.slice(0, 9), w1) === Number(d[9]) && dvDigit(d.slice(0, 10), w2) === Number(d[10])
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14 || allSame(d)) return false
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, ...w1]
  return dvDigit(d.slice(0, 12), w1) === Number(d[12]) && dvDigit(d.slice(0, 13), w2) === Number(d[13])
}

/* Onboarding do primeiro negócio (FE-MVP-01): curto, sem campos sem persistência no backend. */
export const firstBusinessSchema = z
  .object({
    type: z.enum(['COMPANY', 'INDIVIDUAL']),
    document: z.string().min(1, 'Informe o documento'),
    name: z.string().min(2, 'Informe o nome do negócio'),
    categoryId: z.string().min(1, 'Selecione uma categoria'),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || onlyDigits(v).length >= 10, 'Telefone inválido'),
    description: z.string().optional(),
    address: z.string().min(5, 'Informe o endereço'),
  })
  .superRefine((data, ctx) => {
    const digits = onlyDigits(data.document)
    if (data.type === 'COMPANY' && !isValidCnpj(digits)) {
      ctx.addIssue({ code: 'custom', path: ['document'], message: 'CNPJ inválido' })
    }
    if (data.type === 'INDIVIDUAL' && !isValidCpf(digits)) {
      ctx.addIssue({ code: 'custom', path: ['document'], message: 'CPF inválido' })
    }
  })

export type FirstBusinessFormData = z.infer<typeof firstBusinessSchema>

export const loginSchema = z.object({  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export const businessSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().optional(),
  phone: z.string().optional(),

  locationName: z.string().min(2, 'Mínimo 2 caracteres'),
  street: z.string().min(3, 'Rua inválida'),
  number: z.string().min(1, 'Número inválido'),
  neighborhood: z.string().min(2, 'Bairro inválido'),
  city: z.string().min(2, 'Cidade inválida'),
  state: z.string().length(2, 'UF inválido'),
  cep: z.string().length(9, 'CEP inválido'),
  timezone: z.string(),
  attendanceType: z.enum(['AT_LOCATION', 'AT_CUSTOMER', 'BOTH']),
})

export const locationSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  street: z.string().min(3, 'Rua inválida'),
  number: z.string().min(1, 'Número inválido'),
  neighborhood: z.string().min(2, 'Bairro inválido'),
  city: z.string().min(2, 'Cidade inválida'),
  state: z.string().length(2, 'UF inválido'),
  cep: z.string().length(9, 'CEP inválido'),
  timezone: z.string().min(1),
  attendanceType: z.enum(['AT_LOCATION', 'AT_CUSTOMER', 'BOTH']),
  phone: z.string().optional(),
})

export const serviceSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  priceCents: z.number().min(0, 'Preço inválido'),
  durationMinutes: z.number().min(15, 'Mínimo 15 minutos'),
  bufferMinutes: z.number().optional(),
  description: z.string().optional(),
})

export const staffSchema = z.object({
  email: z.string().email('E-mail inválido'),
  locationId: z.string().min(1, 'Selecione um local'),
  role: z.enum(['MANAGER', 'EMPLOYEE']),
  position: z.string().min(2, 'Cargo inválido'),
})

export const appointmentSchema = z.object({
  locationId: z.string().min(1, 'Selecione um local'),
  serviceId: z.string().min(1, 'Selecione um serviço'),
  employeeMembershipId: z.string().optional(),
  date: z.string().min(1, 'Data obrigatória'),
  time: z.string().min(1, 'Horário obrigatório'),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type BusinessFormData = z.infer<typeof businessSchema>
export type LocationFormData = z.infer<typeof locationSchema>
export type ServiceFormData = z.infer<typeof serviceSchema>
export type StaffFormData = z.infer<typeof staffSchema>
export type AppointmentFormData = z.infer<typeof appointmentSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
