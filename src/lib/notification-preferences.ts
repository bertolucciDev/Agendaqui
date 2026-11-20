/**
 * Preferências de notificação — persistência LOCAL (device-local).
 *
 * O backend ainda NÃO expõe endpoint de preferências de notificação
 * (o catálogo de /me/preferences só cobre activeMode/activeBusinessId).
 * Até existir esse endpoint, estas flags ficam no localStorage do navegador,
 * com chave namespaceada — e a UI deixa isso explícito ao usuário.
 */

export const NOTIFICATION_PREFERENCES_KEY = 'agendaqui:notifications'

export interface NotificationPreferences {
  /** Aviso quando um cliente agenda um novo serviço. */
  appointments: boolean
  /** Aviso quando um agendamento é cancelado. */
  cancellations: boolean
  /** Lembretes antes do horário do agendamento. */
  reminders: boolean
  /** Alerta sonoro quando chega um chamado novo na central do suporte. */
  supportTicketSound: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  appointments: true,
  cancellations: true,
  reminders: false,
  supportTicketSound: true,
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/** Lê as preferências do localStorage; ignora payload corrompido. */
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFERENCES_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES }

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    }

    const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as (keyof NotificationPreferences)[]) {
      const value = (parsed as Record<string, unknown>)[key]
      if (isBoolean(value)) prefs[key] = value
    }
    // Remove a antiga flag local de promoções: não existe envio que ela controle.
    if ('promotions' in parsed) saveNotificationPreferences(prefs)
    return prefs
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

/** Grava as preferências no localStorage (best-effort: quota/privado mode não quebram a UI). */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}
