import type { ReactElement } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'loading'

/**
 * Base class applied to every toast surface.
 *
 * The `!` (important) modifiers are required because `react-hot-toast` renders
 * its bar with inline goober styles (`background`, `color`, `padding`,
 * `border-radius`, `max-width`, `box-shadow`, `line-height`). Important
 * utilities guarantee our design tokens win over those defaults.
 */
export const TOAST_BASE_CLASS =
  'flex items-start gap-3 rounded-xl border border-border !p-3 !text-sm !leading-normal !text-foreground !shadow-xl !max-w-sm'

/**
 * Per-variant accent for the toast surface.
 *
 * The variant is carried by the STATUS ICON and a tinted surface — not by a
 * thick colored left border, which reads as a template tic rather than as
 * hierarchy.
 */
export const TOAST_VARIANT_CLASS: Record<ToastVariant, string> = {
  success: '!bg-success-soft',
  error: '!bg-destructive-soft',
  info: '!bg-info-soft',
  warning: '!bg-warning-soft',
  loading: '!bg-muted',
}

const ICON_CLASS = 'h-5 w-5 shrink-0'

/** Icon slot rendered by the toaster for each variant. */
export const TOAST_ICONS: Record<ToastVariant, ReactElement> = {
  success: <CheckCircle2 className={`${ICON_CLASS} text-success-soft-fg`} aria-hidden="true" />,
  error: <XCircle className={`${ICON_CLASS} text-destructive-soft-fg`} aria-hidden="true" />,
  info: <Info className={`${ICON_CLASS} text-info-soft-fg`} aria-hidden="true" />,
  warning: <AlertTriangle className={`${ICON_CLASS} text-warning-soft-fg`} aria-hidden="true" />,
  loading: <Loader2 className={`${ICON_CLASS} animate-spin text-muted-foreground`} aria-hidden="true" />,
}
