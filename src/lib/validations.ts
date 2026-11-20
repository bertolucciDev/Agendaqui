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
  const d = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (d.length !== 14 || !/^[A-Z0-9]{12}\d{2}$/.test(d) || /^([A-Z0-9])\1{13}$/.test(d)) return false
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, ...w1]
  const cnpjDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, char, i) => acc + (char.charCodeAt(0) - 48) * weights[i], 0)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }
  return cnpjDigit(d.slice(0, 12), w1) === Number(d[12]) && cnpjDigit(d.slice(0, 13), w2) === Number(d[13])
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
  password: z.string().min(1, 'Informe a senha'),
})

/**
 * Regra de senha do backend (NestJS DTO):
 *   @MinLength(8) + @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/)
 * espelhada aqui para o usuário receber o erro antes do round-trip.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'A senha deve conter letras e números')

export const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export const businessSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  document: z.string().min(1, 'Informe o documento'),
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
}).superRefine((data, ctx) => {
  const valid = data.type === 'COMPANY'
    ? isValidCnpj(data.document)
    : isValidCpf(data.document)
  if (!valid) {
    ctx.addIssue({
      code: 'custom',
      path: ['document'],
      message: data.type === 'COMPANY' ? 'CNPJ inválido' : 'CPF inválido',
    })
  }
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
  /** Preço em REAIS — a conversão para centavos acontece na submissão. */
  price: z.number().min(0.01, 'Informe um preço válido'),
  durationMinutes: z.number().min(15, 'Mínimo 15 minutos'),
  bufferMinutes: z.number().min(0, 'Intervalo inválido').optional(),
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
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

/** POST /auth/reset-password — e-mail + código de 6 caracteres + nova senha. */
export const resetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z.string().length(6, 'Informe o código de 6 caracteres'),
  newPassword: passwordSchema,
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
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
