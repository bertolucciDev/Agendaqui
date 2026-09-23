import { useState } from 'react'

interface CepData {
  street: string
  neighborhood: string
  city: string
  state: string
}

export function useCepLookup() {
  const [isLoading, setIsLoading] = useState(false)

  const lookupCep = async (cep: string): Promise<CepData | null> => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return null

    setIsLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await response.json()

      if (data.erro) return null

      return {
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }
    } catch {
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { lookupCep, isLoading }
}
