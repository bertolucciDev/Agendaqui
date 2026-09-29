import { isAxiosError } from 'axios'

/**
 * Tradução de erro HTTP em mensagem utilizável.
 *
 * A regra é: NENHUM erro vira "algo deu errado". Cada status tem uma
 * explicação do que aconteceu e, quando o backend manda uma mensagem de
 * domínio (ex.: "Este documento já está cadastrado."), ela aparece — o
 * usuário precisa saber o que corrigir. Detalhes internos nunca vazam: só
 * usamos `message` quando é string não vazia, e nenhum status/stack é
 * interpolado na mensagem exibida.
 */

interface ApiErrorLike {
  response?: { status?: number; data?: { message?: unknown } }
}

export function statusOf(error: unknown): number | null {
  if (isAxiosError(error)) {
    const s = error.response?.status
    return typeof s === 'number' ? s : null
  }
  return null
}

/** `message` do backend quando vier como string ou array de strings. */
function domainMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null
  const data = (error as ApiErrorLike).response?.data
  const raw = (data as { message?: unknown } | undefined)?.message
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  if (Array.isArray(raw) && raw.length > 0) {
    const joined = raw.filter((m): m is string => typeof m === 'string').join(' ')
    if (joined.trim().length > 0) return joined.trim()
  }
  return null
}

type ErrorAction = 'load' | 'create' | 'update' | 'presign' | 'upload' | 'complete' | 'submit' | 'cancel'

const ACTION_LABEL: Record<ErrorAction, string> = {
  load: 'carregar sua solicitação',
  create: 'abrir a solicitação',
  update: 'salvar os dados',
  presign: 'preparar o envio do documento',
  upload: 'enviar o documento',
  complete: 'validar o documento',
  submit: 'enviar a solicitação para análise',
  cancel: 'cancelar a solicitação',
}

/**
 * Mensagem por status. `400` e `422` são erro de entrada do usuário: devolvemos
 * a mensagem do domínio porque ela diz qual campo está errado. `401` exige
 * reautenticação; `410` é o sinal de que o fluxo antigo morreu.
 */
export function describeError(error: unknown, action: ErrorAction): string {
  const status = statusOf(error)
  const domain = domainMessage(error)
  const label = ACTION_LABEL[action]

  if (status === null) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'A operação foi cancelada.'
    }
    return `Não foi possível ${label} por falha de conexão. Verifique sua internet e tente novamente.`
  }

  switch (status) {
    case 400:
    case 422:
      return domain ?? `Não foi possível ${label}: os dados enviados não são válidos. Revise o formulário.`
    case 401:
      return 'Sua sessão expirou. Entre novamente para continuar.'
    case 403:
      return `Você não tem permissão para ${label}.`
    case 404:
      return 'Nenhuma solicitação encontrada para a sua conta.'
    case 409:
      return domain ?? `Não foi possível ${label} porque o estado mudou. Recarregue a página e tente novamente.`
    case 410:
      return 'Este fluxo não existe mais. Recarregue a página para usar o caminho atual.'
    default:
      if (status >= 500) {
        return `O servidor não conseguiu ${label} agora (erro ${status}). Tente novamente em instantes.`
      }
      return domain ?? `Não foi possível ${label} (erro ${status}).`
  }
}
