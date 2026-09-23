import { useNavigate } from 'react-router-dom'
import { OnboardingWizard } from '@/components/wizard/onboarding-wizard'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessesApi } from '@/services/api/businesses'
import { locationsApi } from '@/services/api/locations'
import { servicesApi } from '@/services/api/services'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createBusiness = useMutation({
    mutationFn: businessesApi.create,
  })

  const createLocation = useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: any }) =>
      locationsApi.create(businessId, data),
  })

  const createService = useMutation({
    mutationFn: ({ businessId, data }: { businessId: string; data: any }) =>
      servicesApi.create(businessId, data),
  })

  const handleComplete = async (data: Record<string, any>) => {
    try {
      const business = await createBusiness.mutateAsync({
        name: data.businessName || 'Meu Negócio',
        document: '00000000000',
        type: data.businessType || 'COMPANY',
        categoryId: '',
        locationName: 'Principal',
        address: data.address || '',
        timezone: 'America/Sao_Paulo',
      })

      if (data.address) {
        await createLocation.mutateAsync({
          businessId: business.id,
          data: {
            name: 'Principal',
            address: data.address,
            timezone: 'America/Sao_Paulo',
            attendanceType: 'AT_LOCATION',
          },
        })
      }

      if (data.serviceName) {
        await createService.mutateAsync({
          businessId: business.id,
          data: {
            name: data.serviceName,
            categoryId: '',
            priceCents: Math.round((parseFloat(data.price) || 0) * 100),
            durationMinutes: parseInt(data.duration) || 30,
          },
        })
      }

      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Configuração inicial concluída!')
      navigate('/dashboard')
    } catch {
      toast.error('Erro ao salvar configurações')
    }
  }

  return <OnboardingWizard onComplete={handleComplete} />
}
