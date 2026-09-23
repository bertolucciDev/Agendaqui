import { apiClient } from '@/lib/axios/client'
import type { Category } from '@/types'

export const categoriesApi = {
  list: async () => {
    const { data } = await apiClient.get<Category[]>('categories')
    return data
  },

  create: async (name: string, slug: string, parentId?: string) => {
    const { data } = await apiClient.post<Category>('categories', {
      name,
      slug,
      parentId: parentId || null,
    })
    return data
  },

  delete: async (id: string) => {
    await apiClient.delete(`categories/${id}`)
  },
}
