import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
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
