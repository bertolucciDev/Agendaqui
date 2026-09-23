import { apiClient } from '@/lib/axios/client'
import type { PlatformConfig } from '@/types'

export const platformConfigApi = {
  get: async () => {
    const { data } = await apiClient.get<PlatformConfig>('platform-config')
    return data
  },

  update: async (commissionRateBps: number) => {
    const { data } = await apiClient.put<PlatformConfig>('platform-config', {
      commissionRateBps,
    })
    return data
  },
}
