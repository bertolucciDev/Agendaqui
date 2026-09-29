import type { MeSession } from '@/types/session'
import type { BusinessVerification } from '@/types/business-verification'

/* D8 — REGRA CONGELADA (A.7.2-A.7.5 / micro-gate de revalidação).
 *
 * "Primeiro negócio administrativo ⇒ auto-selecionar OWNER".
 *
 * Regra dura: a decisão é derivada SEMPRE do estado persistido no servidor, lido por rede.
 * Nenhuma decisão pode vir do cache otimista. */

/** Motivo pelo qual D8 encerrou sem escrever. */
export type D8SkipReason =
  | 'VERIFICATION_CHANGED'
  | 'NOT_APPROVED'
  | 'DIFFERENT_APPROVED_BUSINESS'
  | 'MANUAL_CHOICE_PRESERVED'
  | 'BUSINESS_NOT_IN_CATALOG'

export type D8Decision =
  /** Elegível: o chamador deve escrever. */
  | { outcome: 'write' }
  /** O servidor já tem `target` como `activeBusinessId`: D8 já foi concluído. */
  | { outcome: 'completed' }
  /** Contrapróximo de uma condição: encerrar sem escrever, com motivo. */
  | { outcome: 'skipped'; reason: D8SkipReason }

export interface D8EvaluationInput {
  /** `verificationId` observado no momento do disparo (gatilho). */
  watchedVerificationId: string | null
  /** Leitura de rede de `GET /me/business-verification`. */
  verification: BusinessVerification
  /** Leitura de rede de `GET /me/session`. */
  session: MeSession
  /** `approvedBusinessId` que originou o disparo. */
  targetBusinessId: string
}

/**
 * Avalia as condições de D8 na ordem do gate, com corte curto.
 *
 * A ordem é deliberada: V-4 vem antes de qualquer checagem de recurso porque é
 * ele que impede a sobrescrita de uma escolha manual. Se o usuário já escolheu
 * outro negócio, esse é o primeiro desfecho possível.
 */
export function evaluateD8(input: D8EvaluationInput): D8Decision {
  const { watchedVerificationId, verification, session, targetBusinessId } = input

  // V-1 — a solicitação observada é a mesma que o gatilho viu.
  if (verification.verificationId !== watchedVerificationId) {
    return { outcome: 'skipped', reason: 'VERIFICATION_CHANGED' }
  }

  // V-2 — só D8 após a aprovação.
  if (verification.status !== 'APPROVED') {
    return { outcome: 'skipped', reason: 'NOT_APPROVED' }
  }

  // V-3 — o negócio aprovado é exatamente o alvo.
  if (verification.approvedBusinessId !== targetBusinessId) {
    return { outcome: 'skipped', reason: 'DIFFERENT_APPROVED_BUSINESS' }
  }

  // V-4 — ninguém escolheu contexto ainda, ou já é o próprio alvo.
  const active = session.preferences.activeBusinessId
  if (active !== null) {
    if (active === targetBusinessId) {
      // R4: o servidor já gravou. A leitura é mais autoritativa que repetir a escrita.
      return { outcome: 'completed' }
    }
    // R2: escolha manual legícita de outra aba/UI. Nunca sobrescrever.
    return { outcome: 'skipped', reason: 'MANUAL_CHOICE_PRESERVED' }
  }

  // V-5 — o alvo existe no catálogo atual da sessão.
  if (!session.businesses.some((b) => b.id === targetBusinessId)) {
    return { outcome: 'skipped', reason: 'BUSINESS_NOT_IN_CATALOG' }
  }

  return { outcome: 'write' }
}

/** D8 só se aplica a sessão com modo administrativo disponível e sem contexto ativo. */
export function isD8Eligible(session: MeSession): boolean {
  return session.availableModes.includes('OWNER') && session.businesses.length > 0
}
