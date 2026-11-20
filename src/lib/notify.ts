import { createElement } from 'react'
import toast, { type ToastOptions, type ToastPosition } from 'react-hot-toast'
import { ToastMessage } from '@/components/feedback/toast-message'
import { TOAST_BASE_CLASS, TOAST_ICONS, TOAST_VARIANT_CLASS, type ToastVariant } from '@/components/feedback/toast-theme'

/** Generic message used when no error payload could be extracted. */
export const FALLBACK_ERROR_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.'

/** Clickable action rendered inside an error toast. */
export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface NotifyOptions {
  /** Overrides the default duration (ms) for the toast. */
  duration?: number
  /** Extra clickable action rendered inside the toast. */
  action?: NotifyAction
  /** Renders a "Tentar novamente" action that runs the given callback. */
  retry?: () => void
  /** Reuses an existing toast id (useful to update a toast in place). */
  id?: string
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

/** Accepts a plain string or an array of validation messages. */
function readMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return readString(value)
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => readString(item))
      .filter((item): item is string => item !== undefined)
    return parts.length > 0 ? parts.join('; ') : undefined
  }
  return undefined
}

/**
 * Extracts a human readable message from an API payload.
 * Priority: `message` (string), `message` (array), then `error`.
 */
function messageFromPayload(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined
  const message = readMessage(payload.message)
  if (message) return message
  return readString(payload.error)
}

function responseDataOf(error: unknown): unknown {
  if (!isRecord(error)) return undefined
  const response = error.response
  if (!isRecord(response)) return undefined
  return response.data
}

/**
 * Turns an unknown error into a human readable message.
 *
 * Priority:
 *  1. `error.response.data.message` (string)
 *  2. `error.response.data.message` (array of validation messages)
 *  3. `error.response.data.error`
 *  4. `error.message`
 *  5. the fallback message
 *
 * The API wraps payloads in `{ data: ... }` and the axios client unwraps
 * `response.data.data`, so both shapes are handled: when
 * `error.response.data.data` exists and carries a message it wins.
 */
export function extractErrorMessage(
  error: unknown,
  fallback: string = FALLBACK_ERROR_MESSAGE
): string {
  if (typeof error === 'string') return readString(error) ?? fallback

  const data = responseDataOf(error)

  if (isRecord(data)) {
    const wrapped = data.data
    if (wrapped !== undefined) {
      const fromWrapped = messageFromPayload(wrapped)
      if (fromWrapped) return fromWrapped
    }
    const fromData = messageFromPayload(data)
    if (fromData) return fromData
  } else {
    const fromString = readString(data)
    if (fromString) return fromString
  }

  if (isRecord(error)) {
    const fromError = readString(error.message)
    if (fromError) return fromError
  }

  return fallback
}

let toastCounter = 0

function nextToastId(): string {
  toastCounter += 1
  return `agendaqui-toast-${toastCounter}`
}

/** Desktop keeps toasts on the top-right corner; mobile centers them on top. */
function resolvePosition(): ToastPosition {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'top-right'
  }
  return window.matchMedia('(max-width: 640px)').matches ? 'top-center' : 'top-right'
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
  loading: Infinity,
}

function show(variant: ToastVariant, message: string, opts: NotifyOptions = {}): string {
  const id = opts.id ?? nextToastId()

  const content = createElement(ToastMessage, {
    message,
    action: opts.action,
    retry: opts.retry,
    onDismiss: () => toast.dismiss(id),
  })

  const options: ToastOptions = {
    id,
    duration: opts.duration ?? DEFAULT_DURATION[variant],
    position: resolvePosition(),
    icon: TOAST_ICONS[variant],
    className: `${TOAST_BASE_CLASS} ${TOAST_VARIANT_CLASS[variant]}`,
  }

  if (variant === 'success') return toast.success(content, options)
  if (variant === 'error') return toast.error(content, options)
  if (variant === 'loading') return toast.loading(content, options)
  return toast(content, options)
}

/**
 * Centralized feedback facade.
 *
 * ```ts
 * notify.success('Serviço removido')
 * notify.error(err)
 * notify.error(err, { retry: () => refetch() })
 * ```
 */
export const notify = {
  /** Success feedback. Auto dismisses after ~3s. */
  success(message: string, opts?: NotifyOptions): string {
    return show('success', message, opts)
  },

  /**
   * Error feedback. Accepts a plain message or an unknown error object
   * (axios error, `Error`, ...) and extracts a human readable message.
   */
  error(messageOrError: unknown, opts?: NotifyOptions): string {
    const message =
      typeof messageOrError === 'string'
        ? readString(messageOrError) ?? FALLBACK_ERROR_MESSAGE
        : extractErrorMessage(messageOrError)
    return show('error', message, opts)
  },

  /** Neutral information. */
  info(message: string, opts?: NotifyOptions): string {
    return show('info', message, opts)
  },

  /** Warning feedback. */
  warning(message: string, opts?: NotifyOptions): string {
    return show('warning', message, opts)
  },

  /** Pending feedback. Returns the toast id so it can be dismissed later. */
  loading(message: string, opts?: NotifyOptions): string {
    return show('loading', message, opts)
  },

  /** Dismisses a toast (or every toast when no id is given). */
  dismiss(toastId?: string): void {
    toast.dismiss(toastId)
  },
}

export default notify
