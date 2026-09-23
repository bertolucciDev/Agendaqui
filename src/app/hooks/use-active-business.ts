import { useQuery } from '@tanstack/react-query'
import { businessesApi } from '@/services/api/businesses'
import { getActiveBusinessId } from '@/lib/business-store'

export function useActiveBusiness() {
  const { data: businesses = [], ...rest } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessesApi.list,
  })

  const activeId = getActiveBusinessId()
  const business = businesses.find((b) => b.id === activeId) || businesses[0] || null

  return {
    businesses,
    business,
    businessId: business?.id,
    ...rest,
  }
}