import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, usersApi } from '@/services/api'
import type { User } from '@/types'

/**
 * Chave compartilhada do cache do GET /auth/me.
 * O AuthProvider é o dono do dado; qualquer outro ponto da app que precisar
 * do perfil pode ler `useQuery({ queryKey: AUTH_ME_QUERY_KEY })` sem
 * disparar um segundo round-trip.
 */
export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isEmailVerified: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ user: User }>
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ autoVerified: boolean }>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasSession, setHasSession] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    return !!localStorage.getItem('accessToken')
  })

  const {
    data,
    error,
    isLoading: isQueryLoading,
  } = useQuery<User | null>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: authApi.getMe,
    enabled: hasSession,
    retry: false,
    staleTime: 60_000,
  })

  /* Sessão inválida/expirada: limpa os tokens e derruba o estado autenticado
   * (o interceptor do axios já tentou o refresh-token antes de chegar aqui).
   * No TanStack Query v5 o `onError` saiu das opções de `useQuery`, então o
   * tratamento acontece via efeito sobre o estado de erro. */
  useEffect(() => {
    if (!error) return
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    // Remove dados privados em cache, inclusive o catálogo global ['session'].
    queryClient.clear()
    setHasSession(false)
  }, [error, queryClient])

  const user = hasSession ? (data ?? null) : null

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password)
      // A chave ['session'] não contém userId; descarte qualquer catálogo
      // anterior antes de habilitar o carregamento da nova conta.
      queryClient.clear()
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)

      /* O login NÃO devolve o usuário: buscamos o perfil em GET /auth/me e
       * semeamos o cache para o resto da app não pedir de novo. */
      const me = await authApi.getMe()
      queryClient.setQueryData<User | null>(AUTH_ME_QUERY_KEY, me)
      setHasSession(true)
      return { user: me }
    },
    [queryClient]
  )

  const register = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      const result = await usersApi.create(name, email, password, phone)
      return { autoVerified: result.autoVerified }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      queryClient.clear()
      setHasSession(false)
    }
  }, [queryClient])

  const isEmailVerified = !!user?.emailVerifiedAt

  const updateUser = useCallback(
    (data: Partial<User>) => {
      queryClient.setQueryData<User | null>(AUTH_ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, ...data } : prev
      )
    },
    [queryClient]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isEmailVerified,
        isLoading: hasSession ? isQueryLoading : false,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
