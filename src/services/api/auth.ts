import { apiClient } from '@/lib/axios/client'
import type {
  AuthTokens,
  LoginResponse,
  User,
  CustomerProfile,
  AdminProfile,
} from '@/types'

export type PendingEmailChange = { email: string; expiresAt: string }

/** POST /auth/login — o backend devolve APENAS os tokens (sem `user`). */
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

  resendVerificationEmail: async (email: string) => {
    await apiClient.post('auth/verify-email/resend', { email })
  },

  setInitialPassword: async (newPassword: string) => {
    await apiClient.post('auth/first-access/set-password', { newPassword })
  },

  /**
   * POST /auth/create-temp-session → { tempToken }.
   * O token temporário é o que permite trocar a sessão temporária por uma
   * sessão completa (primeiro acesso) — precisa ser devolvido ao chamador.
   */
  createTempSession: async (): Promise<string> => {
    const { data } = await apiClient.post<{ tempToken: string }>(
      'auth/create-temp-session'
    )
    return data?.tempToken ?? ''
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('auth/me')
    return data
  },

  acceptInvite: async (
    email: string,
    code: string,
    name?: string,
    password?: string
  ): Promise<{ membershipId: string; userId: string }> => {
    const { data } = await apiClient.post<{ membershipId: string; userId: string }>(
      'auth/accept-invite',
      { email, code, name, password }
    )
    return data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await apiClient.post('auth/change-password', { currentPassword, newPassword })
  },

  requestEmailChange: async (email: string): Promise<void> => {
    await apiClient.post('auth/email-change/request', { email })
  },

  verifyEmailChange: async (code: string): Promise<void> => {
    await apiClient.post('auth/email-change/verify', { code })
  },

  getPendingEmailChange: async (): Promise<PendingEmailChange | null> => {
    const { data } = await apiClient.get<PendingEmailChange | null>('auth/email-change/pending')
    return data
  },
}

export const usersApi = {
  create: async (name: string, email: string, password: string, phone?: string) => {
    const { data } = await apiClient.post<{ userId: string; autoVerified: boolean }>('users', {
      name,
      email,
      password,
      phone,
    })
    return data
  },

  /** GET /users/:id — mesmo shape de GET /auth/me (alinhado no backend). */
  getById: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`users/${id}`)
    return data
  },

  /** PATCH /users/me — atualiza nome/telefone do usuário autenticado. */
  updateProfile: async (payload: { name?: string; phone?: string | null }): Promise<User> => {
    const { data } = await apiClient.patch<User>('users/me', payload)
    return data
  },
}

export const meApi = {
  getCustomerProfile: async (): Promise<CustomerProfile> => {
    const { data } = await apiClient.get<CustomerProfile>('me/customer-profile')
    return data
  },

  getAdminProfile: async (): Promise<AdminProfile> => {
    const { data } = await apiClient.get<AdminProfile>('me/admin-profile')
    return data
  },
}
