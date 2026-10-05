import type { BusinessVerification } from '@/types/business-verification'

/**
 * Permissões de edição — derivadas do status, nunca de um segundo backend.
 *
 * `MyBusinessVerificationOutput` expõe `status`, `canResubmit`,
 * `missingDocumentTypes` e `maxAttempts`. Regra do domínio:
 *
 * - DRAFT                  → edita, envia documentos, submete
 * - REJECTED               → NÃO editável pelo titular: write-paths do backend
 *                            (findOpenByOwner) só aceitam DRAFT/PENDING, e a
 *                            reabertura acontece só via `request-resend` da
 *                            plataforma (que devolve para DRAFT)
 * - PENDING                → nada editável (decisão em análise)
 * - APPROVED               → nada editável
 * - EXPIRED / CANCELLED    → encerrado; a próxima verificação é uma nova
 *                            solicitação (o backend permite `create`)
 *
 * Estas funções são apresentação pura sobre o contrato. O backend continua
 * sendo quem rejeita uma operação indevida — aqui apenas evitamos mostrar
 * botões que ele infalivelmente recusaria.
 */

export function canEdit(status: BusinessVerification['status']): boolean {
  return status === 'DRAFT'
}

export function canUploadDocuments(status: BusinessVerification['status']): boolean {
  return canEdit(status)
}

export function isClosed(status: BusinessVerification['status']): boolean {
  return status === 'PENDING' || status === 'APPROVED' || status === 'EXPIRED' || status === 'CANCELLED'
}

/**
 * O botão de submit só fica ativo quando não falta nenhum documento
 * obrigatório E o backend diz que a solicitação ainda pode ser submetida.
 * `canResubmit` é o espelho do limite de tentativas do backend.
 */
export function canSubmit(verification: BusinessVerification | null | undefined): boolean {
  if (!verification) return false
  if (!canEdit(verification.status)) return false
  if (verification.missingDocumentTypes.length > 0) return false
  return verification.status === 'DRAFT' || verification.canResubmit
}

/**
 * Sem verificação alguma: o usuário ainda precisa abrir a solicitação.
 *
 * Aceita `undefined` de propósito — a query ainda pode não ter resolvido, e
 * "ainda não carregou" não pode explodir a tela.
 */
export function isEmpty(verification: BusinessVerification | null | undefined): boolean {
  if (!verification) return true
  return verification.verificationId === null
}
