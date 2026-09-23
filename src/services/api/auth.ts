import { apiClient } from '@/lib/axios/client'
import type {
  AuthTokens,
  LoginResponse,
  User,
  CustomerProfile,
  AdminProfile,
} from '@/types'

export const authApi = {
  login: async (email: string, password: string, deviceInfo?: string) => {
    const { data } = await apiClient.post<LoginResponse>('auth/login', {
      email,
      password,
      deviceInfo,
    })
    return data
  },

  refreshToken: async (refreshToken: string) => {
    const { data } = await apiClient.post<AuthTokens>('auth/refresh-token', {
      refreshToken,
    })
    return data
  },

  logout: async () => {
    await apiClient.post('auth/logout')
  },

  logoutAll: async () => {
    await apiClient.post('auth/logout-all')
  },

  forgotPassword: async (email: string) => {
    await apiClient.post('auth/forgot-password', { email })
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    await apiClient.post('auth/reset-password', { email, code, newPassword })
  },

  verifyEmail: async (email: string, code: string) => {
    await apiClient.post('auth/verify-email', { email, code })
  },

  setInitialPassword: async (newPassword: string) => {
    await apiClient.post('auth/first-access/set-password', { newPassword })
  },

  createTempSession: async () => {
    await apiClient.post('auth/create-temp-session')
  },

  getMe: async () => {
    const { data } = await apiClient.get<User>('auth/me')
    return data
  },

  acceptInvite: async (
    email: string,
    code: string,
    name?: string,
    password?: string
  ) => {
    await apiClient.post('auth/accept-invite', { email, code, name, password })
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await apiClient.post('auth/change-password', { currentPassword, newPassword })
  },
}

export const usersApi = {
  create: async (name: string, email: string, password: string, phone?: string) => {
    await apiClient.post('users', { name, email, password, phone })
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get<User>(`users/${id}`)
    return data
  },

  updateProfile: async (payload: { name?: string; phone?: string }) => {
    const { data } = await apiClient.patch<User>('users/me', payload)
    return data
  },
}

export const meApi = {
  getCustomerProfile: async () => {
    const { data } = await apiClient.get<CustomerProfile>('me/customer-profile')
    return data
  },

  getAdminProfile: async () => {
    const { data } = await apiClient.get<AdminProfile>('me/admin-profile')
    return data
  },
}
