import axios from 'axios'

type Dict = Record<string, unknown>

const isDict = (value: unknown): value is Dict =>
  typeof value === 'object' && value !== null

/**
 * Normaliza uma mensagem do backend em texto legível.
 * O ValidationPipe do NestJS devolve `message` como ARRAY de strings
 * (ex.: ['email must be an email']) — por isso nunca usamos `includes`
 * direto no array.
 */
function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
    return parts.length > 0 ? parts.join('; ') : null
  }

  return null
}

/**
 * Extrai a mensagem de erro de uma rejeição do axios.
 * Ordem de precedência (a primeira que existir vence):
 *  1. `response.data.data.message` — payload embrulhado pelo ResponseInterceptor
 *  2. `response.data.message`      — string OU array (ValidationPipe)
 *  3. `response.data.error`        — string
 *  4. `error.message`              — só quando não há resposta HTTP (ex.: 'Network Error')
 * Retorna `null` quando não há nada de útil (aí quem chama usa o fallback).
 */
export function extractApiMessage(error: unknown): string | null {
  if (!isDict(error)) return null

  const response = error.response
  if (isDict(response)) {
    const data = response.data

    if (isDict(data)) {
      const wrapped = data.data
      if (isDict(wrapped)) {
        const wrappedMessage = normalizeMessage(wrapped.message)
        if (wrappedMessage) return wrappedMessage
      }

      const dataMessage = normalizeMessage(data.message)
      if (dataMessage) return dataMessage

      const dataError = normalizeMessage(data.error)
      if (dataError) return dataError
    }

    return null
  }

  if (axios.isAxiosError(error)) {
    // Sem resposta HTTP: erro de rede/CORS — a mensagem do axios é útil.
    return normalizeMessage(error.message)
  }

  return normalizeMessage(error.message)
}

/** Status HTTP da resposta, quando houver. */
export function extractApiStatus(error: unknown): number | undefined {
  if (!isDict(error)) return undefined
  const response = error.response
  if (!isDict(response)) return undefined
  const status = response.status
  return typeof status === 'number' ? status : undefined
}

/** Mensagem legível do backend, com fallback amigável. */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.'
): string {
  return extractApiMessage(error) ?? fallback
}

/**
 * Detecta "senha atual incorreta" em qualquer dialecto de mensagem
 * (backend em PT-BR ou mensagens legadas em inglês).
 */
export function isWrongCurrentPassword(error: unknown): boolean {
  const status = extractApiStatus(error)
  if (status === 401) return true
  const message = extractApiMessage(error)
  if (!message) return false
  return /senha atual|current password|credenciais inv[aá]lidas|invalid credentials/i.test(
    message
  )
}
