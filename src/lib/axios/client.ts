import axios from 'axios'
import { isMockEnabled, initMock } from '@/lib/mock'

const API_URL = import.meta.env.VITE_API_URL

const mockEnabled = isMockEnabled()
const mockAdapter = mockEnabled ? initMock() : undefined

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  ...(mockAdapter ? { adapter: mockAdapter } : {}),
})

apiClient.interceptors.response.use((response) => {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data
  }
  return response
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const url = originalRequest?.url || ''

    const isAuthEndpoint =
      url.includes('auth/login') ||
      url.includes('auth/refresh-token') ||
      url.includes('auth/forgot-password') ||
      url.includes('auth/verify-email') ||
      url.includes('auth/reset-password') ||
      url.includes('auth/accept-invite') ||
      url.endsWith('users')

    if (isAuthEndpoint) {
      return Promise.reject(error)
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}auth/refresh-token`, {
            refreshToken,
          })
          const tokens = data?.data || data
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`
          return apiClient(originalRequest)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/agendaqui/login'
        }
      } else {
        window.location.href = '/agendaqui/login'
      }
    }

    return Promise.reject(error)
  }
)

export { apiClient }
